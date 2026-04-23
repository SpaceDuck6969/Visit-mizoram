const { execSync } = require("child_process");

const port = Number(process.env.PORT) || 3000;

function getPidsOnPortWindows(targetPort) {
    const output = execSync(`netstat -ano | findstr :${targetPort}`, {
        stdio: ["ignore", "pipe", "pipe"],
        encoding: "utf8"
    });

    const pids = new Set();
    output.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.includes("LISTENING")) return;
        const parts = trimmed.split(/\s+/);
        const pid = parts[parts.length - 1];
        if (/^\d+$/.test(pid)) pids.add(pid);
    });
    return [...pids];
}

function stopWindows() {
    let pids = [];
    try {
        pids = getPidsOnPortWindows(port);
    } catch (_) {
        // No process found for this port.
    }

    if (pids.length === 0) {
        console.log(`No process is listening on port ${port}.`);
        return;
    }

    pids.forEach((pid) => {
        execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
        console.log(`Stopped process ${pid} on port ${port}.`);
    });
}

function stopUnix() {
    let output = "";
    try {
        output = execSync(`lsof -ti tcp:${port}`, {
            stdio: ["ignore", "pipe", "ignore"],
            encoding: "utf8"
        }).trim();
    } catch (_) {
        console.log(`No process is listening on port ${port}.`);
        return;
    }

    if (!output) {
        console.log(`No process is listening on port ${port}.`);
        return;
    }

    output.split(/\r?\n/).forEach((pid) => {
        if (!pid) return;
        execSync(`kill -9 ${pid}`, { stdio: "ignore" });
        console.log(`Stopped process ${pid} on port ${port}.`);
    });
}

if (process.platform === "win32") {
    stopWindows();
} else {
    stopUnix();
}
