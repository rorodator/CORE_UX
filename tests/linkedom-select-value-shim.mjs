/**
 * linkedom exposes HTMLSelectElement#value as read-only; patch a writable
 * value so select sync tests match browser behaviour in the Node harness.
 */
const select = document.createElement('select');
select.appendChild(document.createElement('option')).value = 'probe';
const proto = Object.getPrototypeOf(select);
const valueDesc = Object.getOwnPropertyDescriptor(proto, 'value');

if (valueDesc?.get && !valueDesc.set) {
    Object.defineProperty(proto, 'value', {
        configurable: true,
        enumerable: valueDesc.enumerable,
        get() {
            return this.options[this.selectedIndex]?.value ?? '';
        },
        set(nextValue) {
            const options = [...this.options];
            const index = options.findIndex((option) => option.value === nextValue);
            if (index >= 0) {
                this.selectedIndex = index;
            }
        }
    });
}
