/**
 * Sandbox entrypoint. The sandbox has no network, so this forwards 127.0.0.1:3128 to the host's
 * egress proxy socket, then runs the command it was given (OpenCode) and exits with its code.
 */
import net from 'node:net';

const server = net.createServer((client) => {
	const upstream = net.connect('/sandbox/egress.sock');
	client.pipe(upstream).pipe(client);
	client.on('error', () => upstream.destroy());
	upstream.on('error', () => client.destroy());
});
server.listen(3128, '127.0.0.1', async () => {
	const child = Bun.spawn(process.argv.slice(2), { stdio: ['ignore', 'inherit', 'inherit'] });
	process.exit(await child.exited);
});
