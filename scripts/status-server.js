const { execSync } = require("child_process");

const port = Number(process.env.PORT) || 3000;

try {
    if (process.platform === "win32") {
        const output = execSync(`netstat -ano | findstr :${port}`, {
            stdio: ["ignore", "pipe", "ignore"],
            encoding: "utf8"
        }).trim();
        if (!output) {
            console.log(`Server is not running on port ${port}.`);
            process.exit(0);
        }
        console.log(`Processes on port ${port}:\n${output}`);
    } else {
        const output = execSync(`lsof -i tcp:${port}`, {
            stdio: ["ignore", "pipe", "ignore"],
            encoding: "utf8"
        }).trim();
        if (!output) {
            console.log(`Server is not running on port ${port}.`);
            process.exit(0);
        }
        console.log(`Processes on port ${port}:\n${output}`);
    }
} catch (_) {
    console.log(`Server is not running on port ${port}.`);
}
