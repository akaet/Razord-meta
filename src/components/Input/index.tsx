import classnames from 'classnames'
import { KeyboardEvent, FocusEvent, ChangeEvent } from 'react'

import { noop } from '@lib/helper'
import { BaseComponentProps } from '@models/BaseProps'
import './style.scss'

interface InputProps extends BaseComponentProps {
    value?: string | number
    align?: 'left' | 'center' | 'right'
    inside?: boolean
    autoFocus?: boolean
    type?: string
    disabled?: boolean
    placeholder?: string
    onChange?: (value: string, event?: ChangeEvent<HTMLInputElement>) => void
    onEnter?: (event?: KeyboardEvent<HTMLInputElement>) => void
    onBlur?: (event?: FocusEvent<HTMLInputElement>) => void
    onFocus?: (event?: FocusEvent<HTMLInputElement>) => void
}

export function Input (props: InputProps) {
    const {
        className,
        style,
        value = '',
        align = 'center',
        inside = false,
        autoFocus = false,
        type = 'text',
        disabled = false,
        placeholder,
        onChange = noop,
        onBlur = noop,
        onFocus = noop,
        onEnter = noop,
    } = props
    const classname = classnames('input', `text-${align}`, { 'focus:shadow-none': inside }, className)

    function handleKeyDown (e: KeyboardEvent<HTMLInputElement>) {
        if (e.code === 'Enter') {
            onEnter(e)
        }
    }

    return (
        <input
            disabled={disabled}
            className={classname}
            style={style}
            value={value}
            placeholder={placeholder}
            autoFocus={autoFocus}
            type={type}
            onChange={event => onChange(event.target.value, event)}
            onBlur={onBlur}
            onFocus={onFocus}
            onKeyDown={handleKeyDown}
        />
    )
}
