import { Component, ContentChildren, Input, QueryList, ViewEncapsulation, } from '@angular/core';
import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { MatFormField } from '@angular/material/form-field';
export class MtxFormGroupComponent {
    constructor() {
        this._showRequiredMarker = false;
    }
    get showRequiredMarker() {
        return this._showRequiredMarker;
    }
    set showRequiredMarker(value) {
        this._showRequiredMarker = coerceBooleanProperty(value);
    }
    ngOnInit() { }
    ngAfterContentInit() {
        this.formFields.forEach(item => {
            item.appearance = 'standard';
        });
    }
}
MtxFormGroupComponent.decorators = [
    { type: Component, args: [{
                selector: 'mtx-form-group',
                host: {
                    class: 'mtx-form-group',
                },
                template: "<div class=\"mtx-form-field-layout mtx-form-field-appearance-fluent\">\r\n  <label *ngIf=\"label\"\r\n         class=\"mtx-form-label\"\r\n         [class.mtx-form-label-marker]=\"showRequiredMarker\">{{label}}</label>\r\n  <ng-content></ng-content>\r\n</div>\r\n",
                encapsulation: ViewEncapsulation.None,
                styles: [".mtx-form-group{display:inline-block}.mtx-form-group .mtx-form-field-layout{display:inline-flex;align-items:flex-start;width:100%}.mtx-form-group .mtx-form-label{position:relative;display:inline-block;padding-top:calc(.375em + 1px);padding-bottom:calc(.375em + 1px);padding-right:1em;line-height:1.125}[dir=rtl] .mtx-form-group .mtx-form-label{padding-right:unset;padding-left:1em}.mtx-form-group .mtx-form-label.mtx-form-label-marker:after{content:\"*\";margin-left:4px}[dir=rtl] .mtx-form-group .mtx-form-label.mtx-form-label-marker:after{margin-left:auto;margin-right:4px}.mtx-form-field-appearance-fluent .mat-form-field{margin-bottom:.25em}.mtx-form-field-appearance-fluent .mat-form-field .mat-form-field-suffix .mat-datepicker-toggle{display:flex}.mtx-form-field-appearance-fluent .mat-form-field .mat-form-field-suffix .mat-icon-button{height:1.5em;width:1.5em}.mtx-form-field-appearance-fluent .mat-form-field .mat-form-field-suffix .mat-icon-button .mat-datepicker-toggle-default-icon{width:1em}.mtx-form-field-appearance-fluent .mat-form-field-has-label .mat-form-field-flex{margin-top:.84375em}.mtx-form-field-appearance-fluent .mat-form-field-appearance-standard .mat-form-field-flex{padding-top:0}.mtx-form-field-appearance-fluent .mat-form-field-flex{align-items:center;padding:0 .5em;border-radius:2px}.mtx-form-field-appearance-fluent .mat-form-field-infix{border-top:0;padding:.375em 0}.mtx-form-field-appearance-fluent .mat-form-field-prefix,.mtx-form-field-appearance-fluent .mat-form-field-suffix{display:inline-flex}.mtx-form-field-appearance-fluent .mat-form-field-prefix .mat-icon,.mtx-form-field-appearance-fluent .mat-form-field-suffix .mat-icon{line-height:normal}.mtx-form-field-appearance-fluent .mat-form-field-underline{display:none}.mtx-form-field-appearance-fluent .mtx-select{display:block;margin:0 -8px}.mtx-form-field-appearance-fluent .ng-select{padding-top:.4375em;padding-left:8px;padding-right:8px;margin-top:-.4375em}"]
            },] }
];
/** @nocollapse */
MtxFormGroupComponent.ctorParameters = () => [];
MtxFormGroupComponent.propDecorators = {
    formFields: [{ type: ContentChildren, args: [MatFormField,] }],
    label: [{ type: Input }],
    showRequiredMarker: [{ type: Input }]
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9ybS1ncm91cC5jb21wb25lbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9wcm9qZWN0cy9leHRlbnNpb25zL2Zvcm0tZ3JvdXAvZm9ybS1ncm91cC5jb21wb25lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUVMLFNBQVMsRUFDVCxlQUFlLEVBQ2YsS0FBSyxFQUVMLFNBQVMsRUFDVCxpQkFBaUIsR0FDbEIsTUFBTSxlQUFlLENBQUM7QUFDdkIsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDOUQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBVzVELE1BQU0sT0FBTyxxQkFBcUI7SUFhaEM7UUFGUSx3QkFBbUIsR0FBRyxLQUFLLENBQUM7SUFFckIsQ0FBQztJQVRoQixJQUNJLGtCQUFrQjtRQUNwQixPQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FBQztJQUNsQyxDQUFDO0lBQ0QsSUFBSSxrQkFBa0IsQ0FBQyxLQUFjO1FBQ25DLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxxQkFBcUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUMxRCxDQUFDO0lBS0QsUUFBUSxLQUFVLENBQUM7SUFFbkIsa0JBQWtCO1FBQ2hCLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQzdCLElBQUksQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFDO1FBQy9CLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQzs7O1lBOUJGLFNBQVMsU0FBQztnQkFDVCxRQUFRLEVBQUUsZ0JBQWdCO2dCQUMxQixJQUFJLEVBQUU7b0JBQ0osS0FBSyxFQUFFLGdCQUFnQjtpQkFDeEI7Z0JBQ0QsbVJBQTBDO2dCQUUxQyxhQUFhLEVBQUUsaUJBQWlCLENBQUMsSUFBSTs7YUFDdEM7Ozs7O3lCQUVFLGVBQWUsU0FBQyxZQUFZO29CQUU1QixLQUFLO2lDQUNMLEtBQUsiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xyXG4gIEFmdGVyQ29udGVudEluaXQsXHJcbiAgQ29tcG9uZW50LFxyXG4gIENvbnRlbnRDaGlsZHJlbixcclxuICBJbnB1dCxcclxuICBPbkluaXQsXHJcbiAgUXVlcnlMaXN0LFxyXG4gIFZpZXdFbmNhcHN1bGF0aW9uLFxyXG59IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xyXG5pbXBvcnQgeyBjb2VyY2VCb29sZWFuUHJvcGVydHkgfSBmcm9tICdAYW5ndWxhci9jZGsvY29lcmNpb24nO1xyXG5pbXBvcnQgeyBNYXRGb3JtRmllbGQgfSBmcm9tICdAYW5ndWxhci9tYXRlcmlhbC9mb3JtLWZpZWxkJztcclxuXHJcbkBDb21wb25lbnQoe1xyXG4gIHNlbGVjdG9yOiAnbXR4LWZvcm0tZ3JvdXAnLFxyXG4gIGhvc3Q6IHtcclxuICAgIGNsYXNzOiAnbXR4LWZvcm0tZ3JvdXAnLFxyXG4gIH0sXHJcbiAgdGVtcGxhdGVVcmw6ICcuL2Zvcm0tZ3JvdXAuY29tcG9uZW50Lmh0bWwnLFxyXG4gIHN0eWxlVXJsczogWycuL2Zvcm0tZ3JvdXAuY29tcG9uZW50LnNjc3MnXSxcclxuICBlbmNhcHN1bGF0aW9uOiBWaWV3RW5jYXBzdWxhdGlvbi5Ob25lLFxyXG59KVxyXG5leHBvcnQgY2xhc3MgTXR4Rm9ybUdyb3VwQ29tcG9uZW50IGltcGxlbWVudHMgT25Jbml0LCBBZnRlckNvbnRlbnRJbml0IHtcclxuICBAQ29udGVudENoaWxkcmVuKE1hdEZvcm1GaWVsZCkgZm9ybUZpZWxkcyE6IFF1ZXJ5TGlzdDxNYXRGb3JtRmllbGQ+O1xyXG5cclxuICBASW5wdXQoKSBsYWJlbCE6IHN0cmluZztcclxuICBASW5wdXQoKVxyXG4gIGdldCBzaG93UmVxdWlyZWRNYXJrZXIoKSB7XHJcbiAgICByZXR1cm4gdGhpcy5fc2hvd1JlcXVpcmVkTWFya2VyO1xyXG4gIH1cclxuICBzZXQgc2hvd1JlcXVpcmVkTWFya2VyKHZhbHVlOiBib29sZWFuKSB7XHJcbiAgICB0aGlzLl9zaG93UmVxdWlyZWRNYXJrZXIgPSBjb2VyY2VCb29sZWFuUHJvcGVydHkodmFsdWUpO1xyXG4gIH1cclxuICBwcml2YXRlIF9zaG93UmVxdWlyZWRNYXJrZXIgPSBmYWxzZTtcclxuXHJcbiAgY29uc3RydWN0b3IoKSB7fVxyXG5cclxuICBuZ09uSW5pdCgpOiB2b2lkIHt9XHJcblxyXG4gIG5nQWZ0ZXJDb250ZW50SW5pdCgpIHtcclxuICAgIHRoaXMuZm9ybUZpZWxkcy5mb3JFYWNoKGl0ZW0gPT4ge1xyXG4gICAgICBpdGVtLmFwcGVhcmFuY2UgPSAnc3RhbmRhcmQnO1xyXG4gICAgfSk7XHJcbiAgfVxyXG59XHJcbiJdfQ==