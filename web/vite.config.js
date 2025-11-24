import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
const debugPlugin = () => {
    let latestPayload = '{}';
    return {
        name: 'gravitywars-debug-endpoint',
        configureServer(server) {
            server.middlewares.use('/__debug', (req, res, next) => {
                if (req.method === 'POST') {
                    let body = '';
                    req.on('data', (chunk) => {
                        body += chunk;
                    });
                    req.on('end', () => {
                        latestPayload = body || '{}';
                        res.statusCode = 204;
                        res.end();
                    });
                    return;
                }
                if (req.method === 'GET') {
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(latestPayload);
                    return;
                }
                next();
            });
        }
    };
};
export default defineConfig({
    server: {
        port: 4173,
        host: '0.0.0.0'
    },
    resolve: {
        alias: {
            '@core': fileURLToPath(new URL('./src/core', import.meta.url)),
            '@render': fileURLToPath(new URL('./src/render', import.meta.url)),
            '@ui': fileURLToPath(new URL('./src/ui', import.meta.url)),
            '@assets': fileURLToPath(new URL('./src/assets', import.meta.url))
        }
    },
    plugins: [debugPlugin()]
});
