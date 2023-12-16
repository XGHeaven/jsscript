let isEnableLog = false

export function enableLog(enable: boolean) {
  isEnableLog = enable
}

export function debug(...args: any) {
  if (isEnableLog) {
    console.debug(...args)
  }
}
