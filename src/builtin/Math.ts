import { Context } from '../context'
import { JSToNumber } from '../conversion'
import { HostFunctionType, JSNewHostFunction } from '../function'
import { JSDefinePropertyValue, JSNewPlainObject, propertyFlagsFromDescriptor } from '../object'
import { createHostValue, createNumberValue, isExceptionValue } from '../value'

export function JSAddBuiltinMath(ctx: Context) {
  const mathObj = JSNewPlainObject(ctx)

  for (const [name, desc] of Object.entries(Object.getOwnPropertyDescriptors(Math))) {
    const value = desc.value
    if (!value) {
    } else {
      if (typeof value === 'function') {
        const argc = value.length
        const fnObj = JSNewHostFunction(
          ctx,
          (ctx, thisObj, args) => {
            const numbers: number[] = []
            for (const arg of args) {
              const value = JSToNumber(ctx, arg)
              if (isExceptionValue(value)) {
                return value
              }
              numbers.push(value.value)
            }
            return createNumberValue(value(...numbers))
          },
          name,
          argc,
          HostFunctionType.Function
        )
        JSDefinePropertyValue(ctx, mathObj, name, fnObj, propertyFlagsFromDescriptor(desc))
      } else {
        // TODO: assert is not object
        const jsValue = createHostValue(value)
        JSDefinePropertyValue(ctx, mathObj, name, jsValue, propertyFlagsFromDescriptor(desc))
      }
    }
  }

  ctx.defineGlobalValue('Math', mathObj)
}
