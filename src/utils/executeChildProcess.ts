import { exec, ExecException } from 'child_process';

export function executeChildProcess(command: string): Promise<{ exitCode: number, stdout: string, stderr: string }> {
    return new Promise((resolve, reject) => {
        exec(command, (error: ExecException | null, stdout: string, stderr: string) => {
            if (error && error.code === undefined) {
                // This indicates a more serious error (like command not found)
                reject(error);
                return;
            }

            resolve({
                exitCode: error ? error.code || 1 : 0, // Default to 1 if code is undefined but error exists
                stdout: stdout.toString(),
                stderr: stderr.toString()
            });
        });
    });
}

export default executeChildProcess;
