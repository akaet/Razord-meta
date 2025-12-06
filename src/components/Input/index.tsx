import classnames from 'classnames'
import { KeyboardEvent, FocusEvent, ChangeEvent } from 'react'

import { noop } from '@lib/helper'
import { BaseComponentProps } from '@models/BaseProps'
import './style.scss'

import closeIcon from '@assets/close.png'

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
    allowClear?: boolean
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
        onChange = noop,
        onBlur = noop,
        onEnter = noop,
        placeholder,
        allowClear = false,
    } = props
    const classname = classnames('input', `text-${align}`, { 'focus:shadow-none': inside, 'with-clear': allowClear })

    function handleKeyDown (e: KeyboardEvent<HTMLInputElement>) {
        if (e.code === 'Enter') {
            onEnter(e)
        }
    }

    return (
        <div className={classnames('input-wrapper', className)} style={style}>
            <input
                disabled={disabled}
                className={classname}
                value={value}
                autoFocus={autoFocus}
                type={type}
                onChange={event => onChange(event.target.value, event)}
                onBlur={onBlur}
                onFocus={props.onFocus}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
            />
            {allowClear && value && <img src={closeIcon} className="clear-icon" onClick={() => onChange('')} alt="clear" />}
        </div>
    )
}
