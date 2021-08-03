import { Directive, EventEmitter, HostBinding, HostListener, Input, Output, TemplateRef, } from '@angular/core';
export class MtxGridExpansionToggleDirective {
    constructor() {
        this._opened = false;
        this.openedChange = new EventEmitter();
        this.toggleChange = new EventEmitter();
    }
    get opened() {
        return this._opened;
    }
    set opened(newValue) {
        this._opened = newValue;
        this.openedChange.emit(newValue);
    }
    get expanded() {
        return this._opened;
    }
    set expandableRow(value) {
        if (value !== this._row) {
            this._row = value;
        }
    }
    set template(value) {
        if (value !== this._tplRef) {
            this._tplRef = value;
        }
    }
    onClick(event) {
        event.preventDefault();
        event.stopPropagation();
        this.toggle();
    }
    toggle() {
        this.opened = !this.opened;
        this.toggleChange.emit(this);
    }
}
MtxGridExpansionToggleDirective.decorators = [
    { type: Directive, args: [{
                selector: '[mtx-grid-expansion-toggle]',
            },] }
];
/** @nocollapse */
MtxGridExpansionToggleDirective.ctorParameters = () => [];
MtxGridExpansionToggleDirective.propDecorators = {
    opened: [{ type: Input }],
    openedChange: [{ type: Output }],
    expanded: [{ type: HostBinding, args: ['class.expanded',] }],
    expandableRow: [{ type: Input }],
    template: [{ type: Input, args: ['expansionRowTpl',] }],
    toggleChange: [{ type: Output }],
    onClick: [{ type: HostListener, args: ['click', ['$event'],] }]
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwYW5zaW9uLXRvZ2dsZS5kaXJlY3RpdmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9wcm9qZWN0cy9leHRlbnNpb25zL2RhdGEtZ3JpZC9leHBhbnNpb24tdG9nZ2xlLmRpcmVjdGl2ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQ0wsU0FBUyxFQUNULFlBQVksRUFDWixXQUFXLEVBQ1gsWUFBWSxFQUNaLEtBQUssRUFDTCxNQUFNLEVBQ04sV0FBVyxHQUNaLE1BQU0sZUFBZSxDQUFDO0FBS3ZCLE1BQU0sT0FBTywrQkFBK0I7SUFvQzFDO1FBbkNRLFlBQU8sR0FBRyxLQUFLLENBQUM7UUFZZCxpQkFBWSxHQUFHLElBQUksWUFBWSxFQUFXLENBQUM7UUFxQjNDLGlCQUFZLEdBQUcsSUFBSSxZQUFZLEVBQW1DLENBQUM7SUFFOUQsQ0FBQztJQS9CaEIsSUFDSSxNQUFNO1FBQ1IsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDO0lBQ3RCLENBQUM7SUFDRCxJQUFJLE1BQU0sQ0FBQyxRQUFpQjtRQUMxQixJQUFJLENBQUMsT0FBTyxHQUFHLFFBQVEsQ0FBQztRQUN4QixJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNuQyxDQUFDO0lBR0QsSUFDSSxRQUFRO1FBQ1YsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDO0lBQ3RCLENBQUM7SUFFRCxJQUNJLGFBQWEsQ0FBQyxLQUFVO1FBQzFCLElBQUksS0FBSyxLQUFLLElBQUksQ0FBQyxJQUFJLEVBQUU7WUFDdkIsSUFBSSxDQUFDLElBQUksR0FBRyxLQUFLLENBQUM7U0FDbkI7SUFDSCxDQUFDO0lBRUQsSUFDSSxRQUFRLENBQUMsS0FBdUI7UUFDbEMsSUFBSSxLQUFLLEtBQUssSUFBSSxDQUFDLE9BQU8sRUFBRTtZQUMxQixJQUFJLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQztTQUN0QjtJQUNILENBQUM7SUFPRCxPQUFPLENBQUMsS0FBaUI7UUFDdkIsS0FBSyxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQ3ZCLEtBQUssQ0FBQyxlQUFlLEVBQUUsQ0FBQztRQUN4QixJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDaEIsQ0FBQztJQUVELE1BQU07UUFDSixJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQztRQUMzQixJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMvQixDQUFDOzs7WUFuREYsU0FBUyxTQUFDO2dCQUNULFFBQVEsRUFBRSw2QkFBNkI7YUFDeEM7Ozs7O3FCQU1FLEtBQUs7MkJBUUwsTUFBTTt1QkFFTixXQUFXLFNBQUMsZ0JBQWdCOzRCQUs1QixLQUFLO3VCQU9MLEtBQUssU0FBQyxpQkFBaUI7MkJBT3ZCLE1BQU07c0JBSU4sWUFBWSxTQUFDLE9BQU8sRUFBRSxDQUFDLFFBQVEsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XHJcbiAgRGlyZWN0aXZlLFxyXG4gIEV2ZW50RW1pdHRlcixcclxuICBIb3N0QmluZGluZyxcclxuICBIb3N0TGlzdGVuZXIsXHJcbiAgSW5wdXQsXHJcbiAgT3V0cHV0LFxyXG4gIFRlbXBsYXRlUmVmLFxyXG59IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xyXG5cclxuQERpcmVjdGl2ZSh7XHJcbiAgc2VsZWN0b3I6ICdbbXR4LWdyaWQtZXhwYW5zaW9uLXRvZ2dsZV0nLFxyXG59KVxyXG5leHBvcnQgY2xhc3MgTXR4R3JpZEV4cGFuc2lvblRvZ2dsZURpcmVjdGl2ZSB7XHJcbiAgcHJpdmF0ZSBfb3BlbmVkID0gZmFsc2U7XHJcbiAgcHJpdmF0ZSBfcm93OiBhbnk7XHJcbiAgcHJpdmF0ZSBfdHBsUmVmITogVGVtcGxhdGVSZWY8YW55PjtcclxuXHJcbiAgQElucHV0KClcclxuICBnZXQgb3BlbmVkKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuX29wZW5lZDtcclxuICB9XHJcbiAgc2V0IG9wZW5lZChuZXdWYWx1ZTogYm9vbGVhbikge1xyXG4gICAgdGhpcy5fb3BlbmVkID0gbmV3VmFsdWU7XHJcbiAgICB0aGlzLm9wZW5lZENoYW5nZS5lbWl0KG5ld1ZhbHVlKTtcclxuICB9XHJcbiAgQE91dHB1dCgpIG9wZW5lZENoYW5nZSA9IG5ldyBFdmVudEVtaXR0ZXI8Ym9vbGVhbj4oKTtcclxuXHJcbiAgQEhvc3RCaW5kaW5nKCdjbGFzcy5leHBhbmRlZCcpXHJcbiAgZ2V0IGV4cGFuZGVkKCk6IGJvb2xlYW4ge1xyXG4gICAgcmV0dXJuIHRoaXMuX29wZW5lZDtcclxuICB9XHJcblxyXG4gIEBJbnB1dCgpXHJcbiAgc2V0IGV4cGFuZGFibGVSb3codmFsdWU6IGFueSkge1xyXG4gICAgaWYgKHZhbHVlICE9PSB0aGlzLl9yb3cpIHtcclxuICAgICAgdGhpcy5fcm93ID0gdmFsdWU7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBASW5wdXQoJ2V4cGFuc2lvblJvd1RwbCcpXHJcbiAgc2V0IHRlbXBsYXRlKHZhbHVlOiBUZW1wbGF0ZVJlZjxhbnk+KSB7XHJcbiAgICBpZiAodmFsdWUgIT09IHRoaXMuX3RwbFJlZikge1xyXG4gICAgICB0aGlzLl90cGxSZWYgPSB2YWx1ZTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIEBPdXRwdXQoKSB0b2dnbGVDaGFuZ2UgPSBuZXcgRXZlbnRFbWl0dGVyPE10eEdyaWRFeHBhbnNpb25Ub2dnbGVEaXJlY3RpdmU+KCk7XHJcblxyXG4gIGNvbnN0cnVjdG9yKCkge31cclxuXHJcbiAgQEhvc3RMaXN0ZW5lcignY2xpY2snLCBbJyRldmVudCddKVxyXG4gIG9uQ2xpY2soZXZlbnQ6IE1vdXNlRXZlbnQpOiB2b2lkIHtcclxuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgIHRoaXMudG9nZ2xlKCk7XHJcbiAgfVxyXG5cclxuICB0b2dnbGUoKTogdm9pZCB7XHJcbiAgICB0aGlzLm9wZW5lZCA9ICF0aGlzLm9wZW5lZDtcclxuICAgIHRoaXMudG9nZ2xlQ2hhbmdlLmVtaXQodGhpcyk7XHJcbiAgfVxyXG59XHJcbiJdfQ==