import type { InputHTMLAttributes, MouseEvent } from 'react';
import { useRef } from 'react';

type DateInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

/**
 * Keeps native date selection available on mobile while explicitly opening
 * the platform picker when the calendar indicator is tapped.
 */
export function DateInput({ onClick, onKeyDown, ...props }: DateInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function openPicker() {
    const input = inputRef.current;
    if (!input?.showPicker) return;
    try {
      input.showPicker();
    } catch {
      // Some browsers only allow their native picker to open through the
      // default input action. That fallback remains intact.
    }
  }

  function handleClick(event: MouseEvent<HTMLInputElement>) {
    onClick?.(event);
    openPicker();
  }

  return <input {...props} ref={inputRef} type="date" onClick={handleClick} onKeyDown={(event) => {
    onKeyDown?.(event);
    if (!event.defaultPrevented && (event.key === 'Enter' || event.key === ' ')) openPicker();
  }} />;
}
