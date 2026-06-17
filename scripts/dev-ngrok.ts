const port = process.env.PORT ?? '5173'
const host = '0.0.0.0'
const ngrokUrl = 'strangulable-lester-gloatingly.ngrok-free.dev'

const spawn = (
  command: ReadonlyArray<string>,
  env: Record<string, string> = {},
): Bun.Subprocess<'inherit', 'inherit', 'inherit'> =>
  Bun.spawn(command, {
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
    env: { ...process.env, ...env },
  })

const vite = spawn(
  ['bun', 'run', 'dev', '--', '--host', host, '--port', port, '--strictPort'],
  { VITE_ALLOW_EXTERNAL_HOSTS: 'true' },
)

const ngrok = spawn(['bunx', 'ngrok', 'http', `--url=${ngrokUrl}`, port])

const children = [vite, ngrok]
let isStopping = false

const kill = (
  child: Bun.Subprocess<'inherit', 'inherit', 'inherit'>,
  signal: NodeJS.Signals,
): void => {
  try {
    child.kill(signal)
  } catch {
    // Process already exited.
  }
}

const waitForChildren = async (): Promise<void> => {
  await Promise.allSettled(children.map(child => child.exited))
}

const forceStopAfterDelay = async (): Promise<void> => {
  await Bun.sleep(2_000)
  children.forEach(child => kill(child, 'SIGKILL'))
}

const stop = async (exitCode: number): Promise<never> => {
  if (isStopping) {
    await waitForChildren()
    process.exit(exitCode)
  }

  isStopping = true
  children.forEach(child => kill(child, 'SIGINT'))
  await Promise.race([waitForChildren(), forceStopAfterDelay()])
  await waitForChildren()
  process.exit(exitCode)
}

process.on('SIGINT', () => {
  void stop(0)
})

process.on('SIGTERM', () => {
  void stop(0)
})

await Promise.race(children.map(child => child.exited))
await stop(0)
