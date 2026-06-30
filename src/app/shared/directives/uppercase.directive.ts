import { Directive, forwardRef, inject, ElementRef } from '@angular/core';
import { DefaultValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Directive({
  selector: '[appUppercase]',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UppercaseDirective),
      multi: true
    }
  ],
  host: {
    '(input)': 'onInput($event)'
  }
})
export class UppercaseDirective extends DefaultValueAccessor {
  private el = inject(ElementRef);

  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    const upperValue = value.toUpperCase();
    
    // Only update if it actually changed to prevent cursor jumping
    if (value !== upperValue) {
      input.value = upperValue;
      this.onChange(upperValue);
    }
  }
}
