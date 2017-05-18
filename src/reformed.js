import React from 'react'
import assign from 'object-assign'
import hoistNonReactStatics from 'hoist-non-react-statics'
import getComponentName from './_internal/getComponentName'

const makeWrapper = (middleware) => (WrappedComponent) => {
  class FormWrapper extends React.Component {
    static propTypes = {
      initialModel: React.PropTypes.object,
    }

    constructor (props, ctx) {
      super(props, ctx)
      this.state = {
        model: props.initialModel || {},
        lastInputEvent: {}
      }

      // Store input interaction flags for the life of this
      // component outside of state, so they can be updated
      // during render
      this.inputFlags = {}
    }

    setModel = (model) => {
      this.setState({ model })
      return model
    }

    setProperty = (prop, value) => {
      return this.setModel(assign({}, this.state.model, {
        [prop]: value,
      }))
    }

    setInputFlags = (name, flags) => {
      this.inputFlags = assign({}, this.inputFlags, {
        [name]: assign({}, this.inputFlags[name], flags)
      })
      return this.inputFlags
    }

    // This, of course, does not handle all possible inputs. In such cases,
    // you should just use `setProperty` or `setModel`. Or, better yet,
    // extend `reformed` to supply the bindings that match your needs.
    bindToChangeEvent = (e) => {
      const { name, type, value } = e.target

      if (type === 'checkbox') {
        const oldCheckboxValue = this.state.model[name] || []
        const newCheckboxValue = e.target.checked
          ? oldCheckboxValue.concat(value)
          : oldCheckboxValue.filter(v => v !== value)

        this.setProperty(name, newCheckboxValue)
      } else {
        this.setProperty(name, value)
      }

      if (!this.inputFlags[name].dirty) {
        this.setInputFlags(name, { dirty: true })
      }
    }

    bindInput = (name) => {
      if (!this.inputFlags[name]) {
        this.setInputFlags(name, {
          dirty: false,
          touched: false
        })
      }

      return {
        name,
        value: this.state.model[name] || '',
        onChange: this.onInputEvent,
        onBlur: this.onInputEvent,
        onFocus: this.onInputEvent
      }
    }

    onInputEvent = (e) => {
      const { target, type } = e
      const { name } = target
      const lastInputEvent = { name, target, type }

      this.setState({ lastInputEvent })

      if (type === 'change') this.bindToChangeEvent(e)
      if (type === 'focus') this.setInputFlags(name, { touched: true })
    }

    render () {
      const nextProps = assign({}, this.props, {
        bindInput: this.bindInput,
        bindToChangeEvent: this.bindToChangeEvent,
        model: this.state.model,
        setProperty: this.setProperty,
        setModel: this.setModel,
        lastInputEvent: this.state.lastInputEvent,
        inputFlags: this.inputFlags
      })
      // SIDE EFFECT-ABLE. Just for developer convenience and expirementation.
      const finalProps = typeof middleware === 'function'
        ? middleware(nextProps)
        : nextProps

      return React.createElement(WrappedComponent, finalProps)
    }
  }

  FormWrapper.displayName = `Reformed(${getComponentName(WrappedComponent)})`
  return hoistNonReactStatics(FormWrapper, WrappedComponent)
}

export default makeWrapper
