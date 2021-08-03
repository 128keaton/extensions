import { Component, ChangeDetectionStrategy, ViewEncapsulation, Input, Output, EventEmitter, ChangeDetectorRef, forwardRef, ContentChildren, QueryList, } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { MatCheckbox } from '@angular/material/checkbox';
export class MtxCheckboxBase {
    constructor(label, value) {
        this.label = label;
        this.value = value;
    }
}
export class MtxCheckboxGroupComponent {
    constructor(_changeDetectorRef) {
        this._changeDetectorRef = _changeDetectorRef;
        this._items = [];
        this._originalItems = [];
        this.bindLabel = 'label';
        this.bindValue = 'value';
        this.showSelectAll = false;
        this.selectAllLabel = 'Select All';
        this._disabled = false;
        this.change = new EventEmitter();
        this.selectAll = false;
        this.selectAllIndeterminate = false;
        this.color = 'accent';
        this.selectedItems = [];
        this._onChange = () => null;
        this._onTouched = () => null;
    }
    get items() {
        return this._items;
    }
    set items(value) {
        // TODO: Deep clone
        this._originalItems = JSON.parse(JSON.stringify(value));
        this._items = value.map(option => {
            return option instanceof Object ? option : new MtxCheckboxBase(option, option);
        });
    }
    get compareWith() {
        return this._compareWith;
    }
    set compareWith(fn) {
        if (typeof fn !== 'function') {
            throw Error('`compareWith` must be a function.');
        }
        if (fn) {
            this._compareWith = fn;
        }
    }
    get disabled() {
        return this._disabled;
    }
    set disabled(value) {
        this._disabled = coerceBooleanProperty(value);
    }
    ngAfterViewInit() { }
    /**
     * Finds and selects and option based on its value.
     * @returns Option that has the corresponding value.
     */
    _selectValue(value) {
        const correspondingOption = this.items.find(option => {
            try {
                const compareValue = option[this.bindValue] === value;
                return this._compareWith ? this._compareWith(option, value) : compareValue;
            }
            catch (error) {
                console.warn(error);
                return false;
            }
        });
        if (correspondingOption) {
            correspondingOption.checked = true;
        }
        return correspondingOption;
    }
    /**
     * Sets the model value. Implemented as part of ControlValueAccessor.
     * @param value New value to be written to the model.
     */
    writeValue(value) {
        if (value) {
            if (!Array.isArray(value)) {
                throw Error('Value must be an array.');
            }
            value.forEach((currentValue) => this._selectValue(currentValue));
            this.selectedItems = value;
        }
        this._checkMasterCheckboxState();
        this._changeDetectorRef.markForCheck();
    }
    /**
     * Registers a callback to be triggered when the model value changes.
     * Implemented as part of ControlValueAccessor.
     * @param fn Callback to be registered.
     */
    registerOnChange(fn) {
        this._onChange = fn;
    }
    /**
     * Registers a callback to be triggered when the control is touched.
     * Implemented as part of ControlValueAccessor.
     * @param fn Callback to be registered.
     */
    registerOnTouched(fn) {
        this._onTouched = fn;
    }
    /**
     * Sets the disabled state of the control. Implemented as a part of ControlValueAccessor.
     * @param isDisabled Whether the control should be disabled.
     */
    setDisabledState(isDisabled) {
        this._disabled = isDisabled;
    }
    _checkMasterCheckboxState() {
        if (this.items
            .filter(option => option.checked || !option.disabled)
            .every(option => !option.checked)) {
            this.selectAll = false;
            this.selectAllIndeterminate = false;
        }
        else if (this.items
            .filter(option => option.checked || !option.disabled)
            .every(option => option.checked)) {
            this.selectAll = true;
            this.selectAllIndeterminate = false;
        }
        else {
            this.selectAllIndeterminate = true;
        }
    }
    _getSelectedItems(index) {
        this.selectedItems = this.items.filter(option => option.checked);
        if (this._compareWith) {
            this.selectedItems = this._originalItems.filter(option => this.selectedItems.find(selectedOption => this._compareWith(option, selectedOption)));
        }
        else {
            this.selectedItems = this.selectedItems.map(option => option[this.bindValue]);
        }
        this._onChange(this.selectedItems);
        this.change.emit({ model: this.selectedItems, index });
    }
    /** Handle normal checkbox toggle */
    _updateNormalCheckboxState(e, index) {
        this._checkMasterCheckboxState();
        this._getSelectedItems(index);
    }
    /** Handle master checkbox toggle */
    _updateMasterCheckboxState(e, index) {
        this.selectAll = !this.selectAll;
        this.selectAllIndeterminate = false;
        if (this.selectAll) {
            this.items
                .filter(option => option.checked || !option.disabled)
                .forEach(option => (option.checked = true));
        }
        else {
            this.items
                .filter(option => option.checked || !option.disabled)
                .forEach(option => (option.checked = !!option.disabled));
        }
        this._getSelectedItems(index);
    }
}
MtxCheckboxGroupComponent.decorators = [
    { type: Component, args: [{
                selector: 'mtx-checkbox-group',
                exportAs: 'mtxCheckboxGroup',
                host: {
                    class: 'mtx-checkbox-group',
                },
                template: "<mat-checkbox class=\"mtx-checkbox-master\"\n              *ngIf=\"showSelectAll\"\n              [checked]=\"selectAll\"\n              [(indeterminate)]=\"selectAllIndeterminate\"\n              [disabled]=\"disabled\"\n              (change)=\"_updateMasterCheckboxState($event, -1);\">\n  {{selectAllLabel}}\n</mat-checkbox>\n\n<mat-checkbox class=\"mtx-checkbox-normal\"\n              *ngFor=\"let option of items; let i = index;\"\n              [(ngModel)]=\"option.checked\"\n              [aria-describedby]=\"option.ariaDescribedby\"\n              [aria-label]=\"option.ariaLabel\"\n              [aria-labelledby]=\"option.ariaLabelledby\"\n              [color]=\"option.color || color\"\n              [disabled]=\"option.disabled || disabled\"\n              [disableRipple]=\"option.disableRipple\"\n              [labelPosition]=\"option.labelPosition\"\n              [required]=\"option.required\"\n              (change)=\"_updateNormalCheckboxState($event, i)\">\n  {{option[bindLabel] | toObservable | async}}\n</mat-checkbox>\n",
                encapsulation: ViewEncapsulation.None,
                changeDetection: ChangeDetectionStrategy.OnPush,
                providers: [
                    {
                        provide: NG_VALUE_ACCESSOR,
                        useExisting: forwardRef(() => MtxCheckboxGroupComponent),
                        multi: true,
                    },
                ],
                styles: [".mtx-checkbox-group{display:block}.mtx-checkbox-group .mat-checkbox{margin-right:16px}[dir=rtl] .mtx-checkbox-group .mat-checkbox{margin-right:auto;margin-left:16px}"]
            },] }
];
/** @nocollapse */
MtxCheckboxGroupComponent.ctorParameters = () => [
    { type: ChangeDetectorRef }
];
MtxCheckboxGroupComponent.propDecorators = {
    _checkboxes: [{ type: ContentChildren, args: [forwardRef(() => MatCheckbox), { descendants: true },] }],
    items: [{ type: Input }],
    bindLabel: [{ type: Input }],
    bindValue: [{ type: Input }],
    showSelectAll: [{ type: Input }],
    selectAllLabel: [{ type: Input }],
    compareWith: [{ type: Input }],
    disabled: [{ type: Input }],
    change: [{ type: Output }]
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hlY2tib3gtZ3JvdXAuY29tcG9uZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vcHJvamVjdHMvZXh0ZW5zaW9ucy9jaGVja2JveC1ncm91cC9jaGVja2JveC1ncm91cC5jb21wb25lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUNMLFNBQVMsRUFDVCx1QkFBdUIsRUFDdkIsaUJBQWlCLEVBQ2pCLEtBQUssRUFDTCxNQUFNLEVBQ04sWUFBWSxFQUNaLGlCQUFpQixFQUNqQixVQUFVLEVBRVYsZUFBZSxFQUNmLFNBQVMsR0FDVixNQUFNLGVBQWUsQ0FBQztBQUN2QixPQUFPLEVBQUUsaUJBQWlCLEVBQXdCLE1BQU0sZ0JBQWdCLENBQUM7QUFDekUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFFOUQsT0FBTyxFQUFFLFdBQVcsRUFBcUIsTUFBTSw0QkFBNEIsQ0FBQztBQUc1RSxNQUFNLE9BQU8sZUFBZTtJQUMxQixZQUFtQixLQUFXLEVBQVMsS0FBVztRQUEvQixVQUFLLEdBQUwsS0FBSyxDQUFNO1FBQVMsVUFBSyxHQUFMLEtBQUssQ0FBTTtJQUFHLENBQUM7Q0FDdkQ7QUFvQkQsTUFBTSxPQUFPLHlCQUF5QjtJQTBEcEMsWUFBb0Isa0JBQXFDO1FBQXJDLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBbUI7UUEzQ2pELFdBQU0sR0FBVSxFQUFFLENBQUM7UUFDbkIsbUJBQWMsR0FBVSxFQUFFLENBQUM7UUFFMUIsY0FBUyxHQUFHLE9BQU8sQ0FBQztRQUNwQixjQUFTLEdBQUcsT0FBTyxDQUFDO1FBQ3BCLGtCQUFhLEdBQUcsS0FBSyxDQUFDO1FBQ3RCLG1CQUFjLEdBQUcsWUFBWSxDQUFDO1FBdUIvQixjQUFTLEdBQUcsS0FBSyxDQUFDO1FBRWhCLFdBQU0sR0FBRyxJQUFJLFlBQVksRUFBc0QsQ0FBQztRQUUxRixjQUFTLEdBQUcsS0FBSyxDQUFDO1FBQ2xCLDJC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SzswQkFDTCxLQUFLO3VCQWVMLEtBQUs7cUJBU0wsTUFBTSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gIENvbXBvbmVudCxcbiAgQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3ksXG4gIFZpZXdFbmNhcHN1bGF0aW9uLFxuICBJbnB1dCxcbiAgT3V0cHV0LFxuICBFdmVudEVtaXR0ZXIsXG4gIENoYW5nZURldGVjdG9yUmVmLFxuICBmb3J3YXJkUmVmLFxuICBBZnRlclZpZXdJbml0LFxuICBDb250ZW50Q2hpbGRyZW4sXG4gIFF1ZXJ5TGlzdCxcbn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBOR19WQUxVRV9BQ0NFU1NPUiwgQ29udHJvbFZhbHVlQWNjZXNzb3IgfSBmcm9tICdAYW5ndWxhci9mb3Jtcyc7XG5pbXBvcnQgeyBjb2VyY2VCb29sZWFuUHJvcGVydHkgfSBmcm9tICdAYW5ndWxhci9jZGsvY29lcmNpb24nO1xuaW1wb3J0IHsgVGhlbWVQYWxldHRlIH0gZnJvbSAnQGFuZ3VsYXIvbWF0ZXJpYWwvY29yZSc7XG5pbXBvcnQgeyBNYXRDaGVja2JveCwgTWF0Q2hlY2tib3hDaGFuZ2UgfSBmcm9tICdAYW5ndWxhci9tYXRlcmlhbC9jaGVja2JveCc7XG5pbXBvcnQgeyBNdHhDaGVja2JveEdyb3VwT3B0aW9uIH0gZnJvbSAnLi9jaGVja2JveC1ncm91cC5pbnRlcmZhY2UnO1xuXG5leHBvcnQgY2xhc3MgTXR4Q2hlY2tib3hCYXNlIHtcbiAgY29uc3RydWN0b3IocHVibGljIGxhYmVsPzogYW55LCBwdWJsaWMgdmFsdWU/OiBhbnkpIHt9XG59XG5cbkBDb21wb25lbnQoe1xuICBzZWxlY3RvcjogJ210eC1jaGVja2JveC1ncm91cCcsXG4gIGV4cG9ydEFzOiAnbXR4Q2hlY2tib3hHcm91cCcsXG4gIGhvc3Q6IHtcbiAgICBjbGFzczogJ210eC1jaGVja2JveC1ncm91cCcsXG4gIH0sXG4gIHRlbXBsYXRlVXJsOiAnLi9jaGVja2JveC1ncm91cC5jb21wb25lbnQuaHRtbCcsXG4gIHN0eWxlVXJsczogWycuL2NoZWNrYm94LWdyb3VwLmNvbXBvbmVudC5zY3NzJ10sXG4gIGVuY2Fwc3VsYXRpb246IFZpZXdFbmNhcHN1bGF0aW9uLk5vbmUsXG4gIGNoYW5nZURldGVjdGlvbjogQ2hhbmdlRGV0ZWN0aW9uU3RyYXRlZ3kuT25QdXNoLFxuICBwcm92aWRlcnM6IFtcbiAgICB7XG4gICAgICBwcm92aWRlOiBOR19WQUxVRV9BQ0NFU1NPUixcbiAgICAgIHVzZUV4aXN0aW5nOiBmb3J3YXJkUmVmKCgpID0+IE10eENoZWNrYm94R3JvdXBDb21wb25lbnQpLFxuICAgICAgbXVsdGk6IHRydWUsXG4gICAgfSxcbiAgXSxcbn0pXG5leHBvcnQgY2xhc3MgTXR4Q2hlY2tib3hHcm91cENvbXBvbmVudCBpbXBsZW1lbnRzIEFmdGVyVmlld0luaXQsIENvbnRyb2xWYWx1ZUFjY2Vzc29yIHtcbiAgQENvbnRlbnRDaGlsZHJlbihmb3J3YXJkUmVmKCgpID0+IE1hdENoZWNrYm94KSwgeyBkZXNjZW5kYW50czogdHJ1ZSB9KVxuICBfY2hlY2tib3hlcyE6IFF1ZXJ5TGlzdDxNYXRDaGVja2JveD47XG5cbiAgQElucHV0KClcbiAgZ2V0IGl0ZW1zKCkge1xuICAgIHJldHVybiB0aGlzLl9pdGVtcztcbiAgfVxuICBzZXQgaXRlbXModmFsdWU6IGFueVtdKSB7XG4gICAgLy8gVE9ETzogRGVlcCBjbG9uZVxuICAgIHRoaXMuX29yaWdpbmFsSXRlbXMgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHZhbHVlKSk7XG4gICAgdGhpcy5faXRlbXMgPSB2YWx1ZS5tYXAob3B0aW9uID0+IHtcbiAgICAgIHJldHVybiBvcHRpb24gaW5zdGFuY2VvZiBPYmplY3QgPyBvcHRpb24gOiBuZXcgTXR4Q2hlY2tib3hCYXNlKG9wdGlvbiwgb3B0aW9uKTtcbiAgICB9KTtcbiAgfVxuICBwcml2YXRlIF9pdGVtczogYW55W10gPSBbXTtcbiAgcHJpdmF0ZSBfb3JpZ2luYWxJdGVtczogYW55W10gPSBbXTtcblxuICBASW5wdXQoKSBiaW5kTGFiZWwgPSAnbGFiZWwnO1xuICBASW5wdXQoKSBiaW5kVmFsdWUgPSAndmFsdWUnO1xuICBASW5wdXQoKSBzaG93U2VsZWN0QWxsID0gZmFsc2U7XG4gIEBJbnB1dCgpIHNlbGVjdEFsbExhYmVsID0gJ1NlbGVjdCBBbGwnO1xuICBASW5wdXQoKVxuICBnZXQgY29tcGFyZVdpdGgoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2NvbXBhcmVXaXRoO1xuICB9XG4gIHNldCBjb21wYXJlV2l0aChmbjogKG8xOiBhbnksIG8yOiBhbnkpID0+IGJvb2xlYW4pIHtcbiAgICBpZiAodHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aHJvdyBFcnJvcignYGNvbXBhcmVXaXRoYCBtdXN0IGJlIGEgZnVuY3Rpb24uJyk7XG4gICAgfVxuXG4gICAgaWYgKGZuKSB7XG4gICAgICB0aGlzLl9jb21wYXJlV2l0aCA9IGZuO1xuICAgIH1cbiAgfVxuICBwcml2YXRlIF9jb21wYXJlV2l0aCE6IChvMTogYW55LCBvMjogYW55KSA9PiBib29sZWFuO1xuXG4gIEBJbnB1dCgpXG4gIGdldCBkaXNhYmxlZCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5fZGlzYWJsZWQ7XG4gIH1cbiAgc2V0IGRpc2FibGVkKHZhbHVlOiBib29sZWFuKSB7XG4gICAgdGhpcy5fZGlzYWJsZWQgPSBjb2VyY2VCb29sZWFuUHJvcGVydHkodmFsdWUpO1xuICB9XG4gIHByaXZhdGUgX2Rpc2FibGVkID0gZmFsc2U7XG5cbiAgQE91dHB1dCgpIGNoYW5nZSA9IG5ldyBFdmVudEVtaXR0ZXI8eyBtb2RlbDogTXR4Q2hlY2tib3hHcm91cE9wdGlvbltdOyBpbmRleDogbnVtYmVyIH0+KCk7XG5cbiAgc2VsZWN0QWxsID0gZmFsc2U7XG4gIHNlbGVjdEFsbEluZGV0ZXJtaW5hdGUgPSBmYWxzZTtcblxuICBjb2xvcjogVGhlbWVQYWxldHRlID0gJ2FjY2VudCc7XG5cbiAgc2VsZWN0ZWRJdGVtczogTXR4Q2hlY2tib3hHcm91cE9wdGlvbltdID0gW107XG5cbiAgX29uQ2hhbmdlOiAodmFsdWU6IE10eENoZWNrYm94R3JvdXBPcHRpb25bXSkgPT4gdm9pZCA9ICgpID0+IG51bGw7XG4gIF9vblRvdWNoZWQ6ICgpID0+IHZvaWQgPSAoKSA9PiBudWxsO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgX2NoYW5nZURldGVjdG9yUmVmOiBDaGFuZ2VEZXRlY3RvclJlZikge31cblxuICBuZ0FmdGVyVmlld0luaXQoKSB7fVxuXG4gIC8qKlxuICAgKiBGaW5kcyBhbmQgc2VsZWN0cyBhbmQgb3B0aW9uIGJhc2VkIG9uIGl0cyB2YWx1ZS5cbiAgICogQHJldHVybnMgT3B0aW9uIHRoYXQgaGFzIHRoZSBjb3JyZXNwb25kaW5nIHZhbHVlLlxuICAgKi9cbiAgcHJpdmF0ZSBfc2VsZWN0VmFsdWUodmFsdWU6IE10eENoZWNrYm94R3JvdXBPcHRpb24pIHtcbiAgICBjb25zdCBjb3JyZXNwb25kaW5nT3B0aW9uID0gKHRoaXMuaXRlbXMgYXMgTXR4Q2hlY2tib3hHcm91cE9wdGlvbltdKS5maW5kKG9wdGlvbiA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBjb21wYXJlVmFsdWUgPSBvcHRpb25bdGhpcy5iaW5kVmFsdWVdID09PSB2YWx1ZTtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvbXBhcmVXaXRoID8gdGhpcy5fY29tcGFyZVdpdGgob3B0aW9uLCB2YWx1ZSkgOiBjb21wYXJlVmFsdWU7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBjb25zb2xlLndhcm4oZXJyb3IpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBpZiAoY29ycmVzcG9uZGluZ09wdGlvbikge1xuICAgICAgY29ycmVzcG9uZGluZ09wdGlvbi5jaGVja2VkID0gdHJ1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gY29ycmVzcG9uZGluZ09wdGlvbjtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSBtb2RlbCB2YWx1ZS4gSW1wbGVtZW50ZWQgYXMgcGFydCBvZiBDb250cm9sVmFsdWVBY2Nlc3Nvci5cbiAgICogQHBhcmFtIHZhbHVlIE5ldyB2YWx1ZSB0byBiZSB3cml0dGVuIHRvIHRoZSBtb2RlbC5cbiAgICovXG4gIHdyaXRlVmFsdWUodmFsdWU6IGFueVtdKTogdm9pZCB7XG4gICAgaWYgKHZhbHVlKSB7XG4gICAgICBpZiAoIUFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgIHRocm93IEVycm9yKCdWYWx1ZSBtdXN0IGJlIGFuIGFycmF5LicpO1xuICAgICAgfVxuXG4gICAgICB2YWx1ZS5mb3JFYWNoKChjdXJyZW50VmFsdWU6IGFueSkgPT4gdGhpcy5fc2VsZWN0VmFsdWUoY3VycmVudFZhbHVlKSk7XG4gICAgICB0aGlzLnNlbGVjdGVkSXRlbXMgPSB2YWx1ZTtcbiAgICB9XG5cbiAgICB0aGlzLl9jaGVja01hc3RlckNoZWNrYm94U3RhdGUoKTtcbiAgICB0aGlzLl9jaGFuZ2VEZXRlY3RvclJlZi5tYXJrRm9yQ2hlY2soKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWdpc3RlcnMgYSBjYWxsYmFjayB0byBiZSB0cmlnZ2VyZWQgd2hlbiB0aGUgbW9kZWwgdmFsdWUgY2hhbmdlcy5cbiAgICogSW1wbGVtZW50ZWQgYXMgcGFydCBvZiBDb250cm9sVmFsdWVBY2Nlc3Nvci5cbiAgICogQHBhcmFtIGZuIENhbGxiYWNrIHRvIGJlIHJlZ2lzdGVyZWQuXG4gICAqL1xuICByZWdpc3Rlck9uQ2hhbmdlKGZuOiAodmFsdWU6IE10eENoZWNrYm94R3JvdXBPcHRpb25bXSkgPT4ge30pOiB2b2lkIHtcbiAgICB0aGlzLl9vbkNoYW5nZSA9IGZuO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVycyBhIGNhbGxiYWNrIHRvIGJlIHRyaWdnZXJlZCB3aGVuIHRoZSBjb250cm9sIGlzIHRvdWNoZWQuXG4gICAqIEltcGxlbWVudGVkIGFzIHBhcnQgb2YgQ29udHJvbFZhbHVlQWNjZXNzb3IuXG4gICAqIEBwYXJhbSBmbiBDYWxsYmFjayB0byBiZSByZWdpc3RlcmVkLlxuICAgKi9cbiAgcmVnaXN0ZXJPblRvdWNoZWQoZm46ICgpID0+IHt9KTogdm9pZCB7XG4gICAgdGhpcy5fb25Ub3VjaGVkID0gZm47XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB0aGUgZGlzYWJsZWQgc3RhdGUgb2YgdGhlIGNvbnRyb2wuIEltcGxlbWVudGVkIGFzIGEgcGFydCBvZiBDb250cm9sVmFsdWVBY2Nlc3Nvci5cbiAgICogQHBhcmFtIGlzRGlzYWJsZWQgV2hldGhlciB0aGUgY29udHJvbCBzaG91bGQgYmUgZGlzYWJsZWQuXG4gICAqL1xuICBzZXREaXNhYmxlZFN0YXRlKGlzRGlzYWJsZWQ6IGJvb2xlYW4pIHtcbiAgICB0aGlzLl9kaXNhYmxlZCA9IGlzRGlzYWJsZWQ7XG4gIH1cblxuICBwcml2YXRlIF9jaGVja01hc3RlckNoZWNrYm94U3RhdGUoKSB7XG4gICAgaWYgKFxuICAgICAgKHRoaXMuaXRlbXMgYXMgTXR4Q2hlY2tib3hHcm91cE9wdGlvbltdKVxuICAgICAgICAuZmlsdGVyKG9wdGlvbiA9PiBvcHRpb24uY2hlY2tlZCB8fCAhb3B0aW9uLmRpc2FibGVkKVxuICAgICAgICAuZXZlcnkob3B0aW9uID0+ICFvcHRpb24uY2hlY2tlZClcbiAgICApIHtcbiAgICAgIHRoaXMuc2VsZWN0QWxsID0gZmFsc2U7XG4gICAgICB0aGlzLnNlbGVjdEFsbEluZGV0ZXJtaW5hdGUgPSBmYWxzZTtcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgKHRoaXMuaXRlbXMgYXMgTXR4Q2hlY2tib3hHcm91cE9wdGlvbltdKVxuICAgICAgICAuZmlsdGVyKG9wdGlvbiA9PiBvcHRpb24uY2hlY2tlZCB8fCAhb3B0aW9uLmRpc2FibGVkKVxuICAgICAgICAuZXZlcnkob3B0aW9uID0+IG9wdGlvbi5jaGVja2VkKVxuICAgICkge1xuICAgICAgdGhpcy5zZWxlY3RBbGwgPSB0cnVlO1xuICAgICAgdGhpcy5zZWxlY3RBbGxJbmRldGVybWluYXRlID0gZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuc2VsZWN0QWxsSW5kZXRlcm1pbmF0ZSA9IHRydWU7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBfZ2V0U2VsZWN0ZWRJdGVtcyhpbmRleDogbnVtYmVyKSB7XG4gICAgdGhpcy5zZWxlY3RlZEl0ZW1zID0gKHRoaXMuaXRlbXMgYXMgTXR4Q2hlY2tib3hHcm91cE9wdGlvbltdKS5maWx0ZXIob3B0aW9uID0+IG9wdGlvbi5jaGVja2VkKTtcblxuICAgIGlmICh0aGlzLl9jb21wYXJlV2l0aCkge1xuICAgICAgdGhpcy5zZWxlY3RlZEl0ZW1zID0gKHRoaXMuX29yaWdpbmFsSXRlbXMgYXMgTXR4Q2hlY2tib3hHcm91cE9wdGlvbltdKS5maWx0ZXIob3B0aW9uID0+XG4gICAgICAgIHRoaXMuc2VsZWN0ZWRJdGVtcy5maW5kKHNlbGVjdGVkT3B0aW9uID0+IHRoaXMuX2NvbXBhcmVXaXRoKG9wdGlvbiwgc2VsZWN0ZWRPcHRpb24pKVxuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zZWxlY3RlZEl0ZW1zID0gdGhpcy5zZWxlY3RlZEl0ZW1zLm1hcChvcHRpb24gPT4gb3B0aW9uW3RoaXMuYmluZFZhbHVlXSk7XG4gICAgfVxuXG4gICAgdGhpcy5fb25DaGFuZ2UodGhpcy5zZWxlY3RlZEl0ZW1zKTtcblxuICAgIHRoaXMuY2hhbmdlLmVtaXQoeyBtb2RlbDogdGhpcy5zZWxlY3RlZEl0ZW1zLCBpbmRleCB9KTtcbiAgfVxuXG4gIC8qKiBIYW5kbGUgbm9ybWFsIGNoZWNrYm94IHRvZ2dsZSAqL1xuICBfdXBkYXRlTm9ybWFsQ2hlY2tib3hTdGF0ZShlOiBNYXRDaGVja2JveENoYW5nZSwgaW5kZXg6IG51bWJlcik6IHZvaWQge1xuICAgIHRoaXMuX2NoZWNrTWFzdGVyQ2hlY2tib3hTdGF0ZSgpO1xuICAgIHRoaXMuX2dldFNlbGVjdGVkSXRlbXMoaW5kZXgpO1xuICB9XG5cbiAgLyoqIEhhbmRsZSBtYXN0ZXIgY2hlY2tib3ggdG9nZ2xlICovXG4gIF91cGRhdGVNYXN0ZXJDaGVja2JveFN0YXRlKGU6IE1hdENoZWNrYm94Q2hhbmdlLCBpbmRleDogbnVtYmVyKTogdm9pZCB7XG4gICAgdGhpcy5zZWxlY3RBbGwgPSAhdGhpcy5zZWxlY3RBbGw7XG4gICAgdGhpcy5zZWxlY3RBbGxJbmRldGVybWluYXRlID0gZmFsc2U7XG5cbiAgICBpZiAodGhpcy5zZWxlY3RBbGwpIHtcbiAgICAgICh0aGlzLml0ZW1zIGFzIE10eENoZWNrYm94R3JvdXBPcHRpb25bXSlcbiAgICAgICAgLmZpbHRlcihvcHRpb24gPT4gb3B0aW9uLmNoZWNrZWQgfHwgIW9wdGlvbi5kaXNhYmxlZClcbiAgICAgICAgLmZvckVhY2gob3B0aW9uID0+IChvcHRpb24uY2hlY2tlZCA9IHRydWUpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgKHRoaXMuaXRlbXMgYXMgTXR4Q2hlY2tib3hHcm91cE9wdGlvbltdKVxuICAgICAgICAuZmlsdGVyKG9wdGlvbiA9PiBvcHRpb24uY2hlY2tlZCB8fCAhb3B0aW9uLmRpc2FibGVkKVxuICAgICAgICAuZm9yRWFjaChvcHRpb24gPT4gKG9wdGlvbi5jaGVja2VkID0gISFvcHRpb24uZGlzYWJsZWQpKTtcbiAgICB9XG5cbiAgICB0aGlzLl9nZXRTZWxlY3RlZEl0ZW1zKGluZGV4KTtcbiAgfVxufVxuIl19