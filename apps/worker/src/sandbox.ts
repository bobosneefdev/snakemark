import net from 'node:net';
import { Duration, Effect, FileSystem, Option, Path, Redacted, Stream } from 'effect';
import { ChildProcess } from 'effect/process';
import type { Candidate } from './opencode';

/** Long enough for a reasoning model to grind through a 100-food plan, short enough to finish the daily job. */
export const RUN_TIMEOUT = Duration.minutes(15);

/**
 * Host-side HTTPS proxy on a unix socket that only tunnels to `host:443`. It is the sandbox's
 * single way out, so the model can reach its own provider API and nothing else.
 */
const egress = (socket: string, host: string) =>
	Effect.acquireRelease(
		Effect.callback<net.Server>((resume) => {
			const server = net.createServer((client) => {
				client.on('error', () => {});
				client.once('data', (head) => {
					const target = /^CONNECT ([^\s:]+):443 HTTP\/1\.[01]\r\n/.exec(head.toString('latin1'))?.[1];
					if (target !== host) return void client.end('HTTP/1.1 403 Forbidden\r\n\r\n');
					const upstream = net.connect(443, host, () => {
						client.write('HTTP/1.1 200 Connection Established\r\n\r\n');
						upstream.pipe(client).pipe(upstream);
					});
					upstream.on('error', () => client.destroy());
				});
			});
			server.listen(socket, () => resume(Effect.succeed(server)));
		}),
		(server) => Effect.sync(() => server.close())
	);

export interface Outcome {
	/** stdout of `opencode run --format json`, or none when the run hit RUN_TIMEOUT */
	stdout: Option.Option<string>;
	seconds: number;
}

/**
 * Runs stock OpenCode once inside bubblewrap: every namespace unshared (no network at all),
 * read-only /usr, a throwaway home, and an env holding only this provider's key.
 */
export const runSandboxed = Effect.fn('Sandbox.run')(function* (
	candidate: Candidate,
	key: Redacted.Redacted,
	prompt: string,
	catalog: string,
	opencode: string
) {
	const fs = yield* FileSystem.FileSystem;
	const path = yield* Path.Path;
	const dir = yield* fs.makeTempDirectoryScoped({ prefix: 'snakemark-' });
	yield* fs.makeDirectory(path.join(dir, 'home'));
	yield* fs.makeDirectory(path.join(dir, 'work'));
	yield* fs.writeFileString(path.join(dir, 'models.json'), catalog);
	yield* egress(path.join(dir, 'egress.sock'), candidate.host);

	const bridge = path.join(import.meta.dir, 'bridge.ts');
	// prettier-ignore
	const args = [
		'--unshare-all', '--die-with-parent', '--new-session',
		'--ro-bind', '/usr', '/usr',
		'--symlink', 'usr/bin', '/bin', '--symlink', 'usr/lib', '/lib', '--symlink', 'usr/lib64', '/lib64',
		'--ro-bind-try', '/etc/ssl', '/etc/ssl', '--ro-bind-try', '/etc/ca-certificates', '/etc/ca-certificates',
		'--proc', '/proc', '--dev', '/dev', '--tmpfs', '/tmp',
		'--bind', dir, '/sandbox',
		'--ro-bind', process.execPath, '/opt/bun', '--ro-bind', bridge, '/opt/bridge.ts', '--ro-bind', opencode, '/opt/opencode',
		'--chdir', '/sandbox/work',
		'/opt/bun', '/opt/bridge.ts',
		'/opt/opencode', 'run', '--format', 'json',
		'--model', `${candidate.provider}/${candidate.model}`,
		prompt
	];
	const proxy = 'http://127.0.0.1:3128';
	const command = ChildProcess.make('bwrap', args, {
		extendEnv: false,
		stderr: 'ignore',
		env: {
			PATH: '/usr/bin:/bin',
			HOME: '/sandbox/home',
			HTTPS_PROXY: proxy,
			HTTP_PROXY: proxy,
			// OpenCode's CLI talks to its own local server; that must not go through the proxy
			NO_PROXY: '127.0.0.1,localhost',
			[candidate.keyEnv]: Redacted.value(key),
			OPENCODE_MODELS_PATH: '/sandbox/models.json',
			OPENCODE_DISABLE_MODELS_FETCH: '1',
			OPENCODE_DISABLE_AUTOUPDATE: '1',
			// The prompt forbids tools and code execution, so every tool is denied rather than trusted to the model.
			OPENCODE_CONFIG_CONTENT: JSON.stringify({ share: 'disabled', enabled_providers: [candidate.provider], permission: 'deny' })
		}
	});

	const [elapsed, stdout] = yield* command.pipe(
		Effect.flatMap((handle) => handle.stdout.pipe(Stream.decodeText(), Stream.mkString)),
		Effect.scoped,
		Effect.timeoutOption(RUN_TIMEOUT),
		Effect.timed
	);
	return { stdout, seconds: Math.round(Duration.toMillis(elapsed) / 100) / 10 } satisfies Outcome;
}, Effect.scoped);
