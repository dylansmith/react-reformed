import React from 'react'
import assign from 'object-assign'
import hoistNonReactStatics from 'hoist-non-react-statics'
import getComponentName from './_internal/getComponentName'

const getAllValidationErrors = (schema, props, prevResults) => {
  const results = Object.keys(schema).reduce((acc, key) => {
    const result = getValidationErrorsForProp(schema, props, key, prevResults)
    if (!result) return acc
    return assign({}, acc, {
      fields: assign({}, acc.fields, { [key]: result })
    })
  }, prevResults)

  results.isValid = Object.keys(results.fields).reduce((acc, key) => {
    return acc && results.fields[key].isChecked && results.fields[key].isValid
  }, true)

  return results
}

const getValidationErrorsForProp = (schema, props, key, prevResults) => {
  const errors = []
  const { model, lastInputEvent, inputFlags } = props
  const prevResult = prevResults.fields[key] || {}
  const value = model[key]
  const rules = schema[key]
  const flags = inputFlags[key] || {}
  const updateOn = rules.updateOn || 'change'

  const isFirstEvaluation = (!prevResults.fields[key])
  const isInteracted = (!!flags.dirty)
  const isRelatedEvent = (lastInputEvent.name === key)
  const isValidEventType = (lastInputEvent.type === updateOn)
  const isCurrentlyInvalid = (prevResult.isValid === false)
  const isNotEmpty = (!!value)

  const shouldValidate = (
    isInteracted &&
    isRelatedEvent &&
    (isValidEventType || isCurrentlyInvalid)
  ) || (!isInteracted && isNotEmpty)

  if (shouldValidate === false) {
    return (isFirstEvaluation)
      ? { isChecked: false, isValid: true, errors: [] }
      : prevResult
  }

  const renderError = (condition, fallback) => {
    return typeof rules.formatError === 'function'
      ? rules.formatError({ key, value, condition, rules, schema, model })
      : fallback
  }

  if (rules.required && !value) {
    errors.push(renderError('required', `${key} is required`))
  }
  if (rules.type && typeof value !== rules.type) {
    errors.push(renderError('type', `${key} must be of type ${rules.type}, but got ${typeof value}`))
  }
  if (rules.minLength) {
    if (!value || value.length < rules.minLength) {
      errors.push(renderError('minLength', `${key} must have at least ${rules.minLength} characters`))
    }
  }
  if (rules.maxLength) {
    if (value && value.length > rules.maxLength) {
      errors.push(renderError('maxLength', `${key} must not have more than ${rules.maxLength} characters`))
    }
  }
  if (rules.test) {
    let error
    rules.test(value, (msg) => {
      error = msg
    })
    if (error) {
      errors.push(error)
    }
  }

  return {
    isChecked: true,
    isValid: !errors.length,
    errors
  }
}

const validateSchema = (schema) => (WrappedComponent) => {
  let validationErrors = { isValid: true, fields: {} }

  const validated = (props) => {
    validationErrors = getAllValidationErrors(schema, props, validationErrors)
    return React.createElement(WrappedComponent, assign({}, props, {
      schema: validationErrors
    }))
  }
  validated.displayName = `ValidateSchema(${getComponentName(WrappedComponent)})`
  return hoistNonReactStatics(validated, WrappedComponent)
}

export default validateSchema
