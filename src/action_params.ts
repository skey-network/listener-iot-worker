type ActionParams = {
  /** id of transaction */
  tx: string
  /** address of device */
  device?: string
  /** action to be made */
  action?: string
  /** key id */
  key?: string
  /** invoked function */
  func?: string
  /** device model */
  deviceModel?: string
}

export default ActionParams
