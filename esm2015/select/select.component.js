import { Component, ViewEncapsulation, ChangeDetectionStrategy, Input, ElementRef, ChangeDetectorRef, Optional, Self, Output, EventEmitter, TemplateRef, ContentChild, ContentChildren, QueryList, ViewChild, } from '@angular/core';
import { NgControl } from '@angular/forms';
import { MatFormFieldControl } from '@angular/material/form-field';
import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { FocusMonitor } from '@angular/cdk/a11y';
import { Subject, merge } from 'rxjs';
import { takeUntil, startWith } from 'rxjs/operators';
import { MtxSelectOptionTemplateDirective, MtxSelectLabelTemplateDirective, MtxSelectHeaderTemplateDirective, MtxSelectFooterTemplateDirective, MtxSelectOptgroupTemplateDirective, MtxSelectNotFoundTemplateDirective, MtxSelectTypeToSearchTemplateDirective, MtxSelectLoadingTextTemplateDirective, MtxSelectMultiLabelTemplateDirective, MtxSelectTagTemplateDirective, MtxSelectLoadingSpinnerTemplateDirective, } from './templates.directive';
import { MtxOptionComponent } from './option.component';
import { NgSelectComponent } from '@ng-select/ng-select';
export function isDefined(value) {
    return value !== undefined && value !== null;
}
let nextUniqueId = 0;
export class MtxSelectComponent {
    constructor(_focusMonitor, _elementRef, _changeDetectorRef, ngControl) {
        this._focusMonitor = _focusMonitor;
        this._elementRef = _elementRef;
        this._changeDetectorRef = _changeDetectorRef;
        this.ngControl = ngControl;
        /** MtxSelect options */
        this.addTag = false;
        this.addTagText = 'Add item';
        this.appearance = 'underline';
        this.closeOnSelect = true;
        this.clearAllText = 'Clear all';
        this.clearable = true;
        this.clearOnBackspace = true;
        this.dropdownPosition = 'auto';
        this.selectableGroup = false;
        this.selectableGroupAsModel = true;
        this.hideSelected = false;
        this.loading = false;
        this.loadingText = 'Loading...';
        this.labelForId = null;
        this.markFirst = true;
        this.multiple = false;
        this.notFoundText = 'No items found';
        this.searchable = true;
        this.readonly = false;
        this.searchFn = null;
        this.searchWhileComposing = true;
        this.selectOnTab = false;
        this.trackByFn = null;
        this.inputAttrs = {};
        this.minTermLength = 0;
        this.editableSearchTerm = false;
        this.keyDownFn = (_) => true;
        this.virtualScroll = false;
        this.typeToSearchText = 'Type to search';
        this.blurEvent = new EventEmitter();
        this.focusEvent = new EventEmitter();
        this.changeEvent = new EventEmitter();
        this.openEvent = new EventEmitter();
        this.closeEvent = new EventEmitter();
        this.searchEvent = new EventEmitter();
        this.clearEvent = new EventEmitter();
        this.addEvent = new EventEmitter();
        this.removeEvent = new EventEmitter();
        this.scroll = new EventEmitter();
        this.scrollToEnd = new EventEmitter();
        this._items = [];
        this._destroy$ = new Subject();
        this._value = null;
        /** Implemented as part of MatFormFieldControl. */
        this.stateChanges = new Subject();
        /** Unique id for this input. */
        this._uid = `mtx-select-${nextUniqueId++}`;
        this._focused = false;
        this._required = false;
        this._disabled = false;
        this.errorState = false;
        /** A name for this control that can be used by `mat-form-field`. */
        this.controlType = 'mtx-select';
        /** `View -> model callback called when value changes` */
        this._onChange = () => { };
        /** `View -> model callback called when select has been touched` */
        this._onTouched = () => { };
        _focusMonitor.monitor(_elementRef, true).subscribe(origin => {
            if (this._focused && !origin) {
                this._onTouched();
            }
            this._focused = !!origin;
            this.stateChanges.next();
        });
        if (this.ngControl != null) {
            this.ngControl.valueAccessor = this;
        }
    }
    get clearSearchOnAdd() {
        return isDefined(this._clearSearchOnAdd) ? this._clearSearchOnAdd : this.closeOnSelect;
    }
    set clearSearchOnAdd(value) {
        this._clearSearchOnAdd = value;
    }
    get items() {
        return this._items;
    }
    set items(value) {
        this._itemsAreUsed = true;
        this._items = value;
    }
    /** Value of the select control. */
    get value() {
        return this._value;
    }
    set value(newValue) {
        this._value = newValue;
        this._onChange(newValue);
        this.stateChanges.next();
    }
    /** Unique id of the element. */
    get id() {
        return this._id;
    }
    set id(value) {
        this._id = value || this._uid;
        this.stateChanges.next();
    }
    /** Placeholder to be shown if value is empty. */
    get placeholder() {
        return this._placeholder;
    }
    set placeholder(value) {
        this._placeholder = value;
        this.stateChanges.next();
    }
    /** Whether the input is focused. */
    get focused() {
        return this._focused;
    }
    get empty() {
        return this.value == null || (Array.isArray(this.value) && this.value.length === 0);
    }
    get shouldLabelFloat() {
        return this.focused || !this.empty;
    }
    get required() {
        return this._required;
    }
    set required(value) {
        this._required = coerceBooleanProperty(value);
        this.stateChanges.next();
    }
    get disabled() {
        return this._disabled;
    }
    set disabled(value) {
        this._disabled = coerceBooleanProperty(value);
        this.readonly = this._disabled;
        this.stateChanges.next();
    }
    ngOnInit() {
        // Fix compareWith warning of undefined value
        // https://github.com/ng-select/ng-select/issues/1537
        if (this.compareWith) {
            this.ngSelect.compareWith = this.compareWith;
        }
    }
    ngAfterViewInit() {
        if (!this._itemsAreUsed) {
            this._setItemsFromMtxOptions();
        }
    }
    ngDoCheck() {
        if (this.ngControl) {
            this.errorState = (this.ngControl.invalid && this.ngControl.touched);
            this.stateChanges.next();
        }
    }
    ngOnDestroy() {
        this._destroy$.next();
        this._destroy$.complete();
        this.stateChanges.complete();
        this._focusMonitor.stopMonitoring(this._elementRef);
    }
    /** Implemented as part of MatFormFieldControl. */
    setDescribedByIds(ids) {
        this._ariaDescribedby = ids.join(' ');
    }
    /**
     * Disables the select. Part of the ControlValueAccessor interface required
     * to integrate with Angular's core forms API.
     *
     * @param isDisabled Sets whether the component is disabled.
     */
    setDisabledState(isDisabled) {
        this.disabled = isDisabled;
    }
    /** Implemented as part of MatFormFieldControl. */
    onContainerClick(event) {
        var _a;
        const target = event.target;
        if (/mat-form-field|mtx-select/g.test(((_a = target.parentElement) === null || _a === void 0 ? void 0 : _a.classList[0]) || '')) {
            this.focus();
            this.open();
        }
    }
    /**
     * Sets the select's value. Part of the ControlValueAccessor interface
     * required to integrate with Angular's core forms API.
     *
     * @param value New value to be written to the model.
     */
    writeValue(value) {
        this.value = value;
        this._changeDetectorRef.markForCheck();
    }
    /**
     * Saves a callback function to be invoked when the select's value
     * changes from user input. Part of the ControlValueAccessor interface
     * required to integrate with Angular's core forms API.
     *
     * @param fn Callback to be triggered when the value changes.
     */
    registerOnChange(fn) {
        this._onChange = fn;
    }
    /**
     * Saves a callback function to be invoked when the select is blurred
     * by the user. Part of the ControlValueAccessor interface required
     * to integrate with Angular's core forms API.
     *
     * @param fn Callback to be triggered when the component has been touched.
     */
    registerOnTouched(fn) {
        this._onTouched = fn;
    }
    /** NgSelect: _setItemsFromNgOptions */
    _setItemsFromMtxOptions() {
        const mapMtxOptions = (options) => {
            this.items = options.map(option => ({
                $ngOptionValue: option.value,
                $ngOptionLabel: option.elementRef.nativeElement.innerHTML,
                disabled: option.disabled,
            }));
            this.ngSelect.itemsList.setItems(this.items);
            if (this.ngSelect.hasValue) {
                this.ngSelect.itemsList.mapSelectedItems();
            }
            this.ngSelect.detectChanges();
        };
        const handleOptionChange = () => {
            const changedOrDestroyed = merge(this.mtxOptions.changes, this._destroy$);
            merge(...this.mtxOptions.map(option => option.stateChange$))
                .pipe(takeUntil(changedOrDestroyed))
                .subscribe(option => {
                const item = this.ngSelect.itemsList.findItem(option.value);
                item.disabled = option.disabled;
                item.label = option.label || item.label;
                this.ngSelect.detectChanges();
            });
        };
        this.mtxOptions.changes
            .pipe(startWith(this.mtxOptions), takeUntil(this._destroy$))
            .subscribe(options => {
            mapMtxOptions(options);
            handleOptionChange();
        });
    }
    open() {
        this.ngSelect.open();
    }
    close() {
        this.ngSelect.close();
    }
    focus() {
        this.ngSelect.focus();
    }
    blur() {
        this.ngSelect.blur();
    }
}
MtxSelectComponent.decorators = [
    { type: Component, args: [{
                selector: 'mtx-select',
                exportAs: 'mtxSelect',
                host: {
                    '[attr.id]': 'id',
                    '[attr.aria-describedby]': '_ariaDescribedby || null',
                    '[class.mtx-select-floating]': 'shouldLabelFloat',
                    '[class.mtx-select-invalid]': 'errorState',
                    'class': 'mtx-select',
                },
                template: "<ng-select #ngSelect [class.ng-select-invalid]=\"errorState\"\n           [(ngModel)]=\"value\"\n           [placeholder]=\"placeholder\"\n           [items]=\"items\"\n           [addTag]=\"addTag\"\n           [addTagText]=\"addTagText\"\n           [appendTo]=\"appendTo\"\n           [appearance]=\"appearance\"\n           [bindLabel]=\"bindLabel\"\n           [bindValue]=\"bindValue\"\n           [closeOnSelect]=\"closeOnSelect\"\n           [clearAllText]=\"clearAllText\"\n           [clearable]=\"clearable\"\n           [clearOnBackspace]=\"clearOnBackspace\"\n           [dropdownPosition]=\"dropdownPosition\"\n           [groupBy]=\"groupBy\"\n           [groupValue]=\"groupValue\"\n           [hideSelected]=\"hideSelected\"\n           [isOpen]=\"isOpen\"\n           [inputAttrs]=\"inputAttrs\"\n           [loading]=\"loading\"\n           [loadingText]=\"loadingText\"\n           [labelForId]=\"labelForId\"\n           [markFirst]=\"markFirst\"\n           [maxSelectedItems]=\"maxSelectedItems\"\n           [multiple]=\"multiple\"\n           [notFoundText]=\"notFoundText\"\n           [readonly]=\"readonly\"\n           [typeahead]=\"typeahead\"\n           [typeToSearchText]=\"typeToSearchText\"\n           [trackByFn]=\"trackByFn\"\n           [searchable]=\"searchable\"\n           [searchFn]=\"searchFn\"\n           [searchWhileComposing]=\"searchWhileComposing\"\n           [clearSearchOnAdd]=\"clearSearchOnAdd\"\n           [selectableGroup]=\"selectableGroup\"\n           [selectableGroupAsModel]=\"selectableGroupAsModel\"\n           [selectOnTab]=\"selectOnTab\"\n           [tabIndex]=\"tabIndex\"\n           [openOnEnter]=\"openOnEnter\"\n           [minTermLength]=\"minTermLength\"\n           [editableSearchTerm]=\"editableSearchTerm\"\n           [keyDownFn]=\"keyDownFn\"\n           [virtualScroll]=\"virtualScroll\"\n           (blur)=\"blurEvent.emit($event)\"\n           (focus)=\"focusEvent.emit($event)\"\n           (change)=\"changeEvent.emit($event)\"\n           (open)=\"openEvent.emit($event)\"\n           (close)=\"closeEvent.emit($event)\"\n           (search)=\"searchEvent.emit($event)\"\n           (clear)=\"clearEvent.emit($event)\"\n           (add)=\"addEvent.emit($event)\"\n           (remove)=\"removeEvent.emit($event)\"\n           (scroll)=\"scroll.emit($event)\"\n           (scrollToEnd)=\"scrollToEnd.emit($event)\">\n\n  <ng-container *ngIf=\"optionTemplate\">\n    <ng-template ng-option-tmp let-item=\"item\" let-item$=\"item$\" let-index=\"index\"\n                 let-searchTerm=\"searchTerm\">\n      <ng-template [ngTemplateOutlet]=\"optionTemplate\"\n                   [ngTemplateOutletContext]=\"{ item: item, item$: item$, index: index, searchTerm: searchTerm }\">\n      </ng-template>\n    </ng-template>\n  </ng-container>\n\n  <ng-container *ngIf=\"optgroupTemplate\">\n    <ng-template ng-optgroup-tmp let-item=\"item\" let-item$=\"item$\" let-index=\"index\"\n                 let-searchTerm=\"searchTerm\">\n      <ng-template [ngTemplateOutlet]=\"optgroupTemplate\"\n                   [ngTemplateOutletContext]=\"{ item: item, item$: item$, index: index, searchTerm: searchTerm }\">\n      </ng-template>\n    </ng-template>\n  </ng-container>\n\n  <ng-container *ngIf=\"labelTemplate\">\n    <ng-template ng-label-tmp let-item=\"item\" let-clear=\"clear\" let-label=\"label\">\n      <ng-template [ngTemplateOutlet]=\"labelTemplate\"\n                   [ngTemplateOutletContext]=\"{ item: item, clear: clear, label: label }\">\n      </ng-template>\n    </ng-template>\n  </ng-container>\n\n  <ng-container *ngIf=\"multiLabelTemplate\">\n    <ng-template ng-multi-label-tmp let-items=\"items\" let-clear=\"clear\">\n      <ng-template [ngTemplateOutlet]=\"multiLabelTemplate\"\n                   [ngTemplateOutletContext]=\"{ items: items, clear: clear }\">\n      </ng-template>\n    </ng-template>\n  </ng-container>\n\n  <ng-container *ngIf=\"headerTemplate\">\n    <ng-template ng-header-tmp>\n      <ng-template [ngTemplateOutlet]=\"headerTemplate\">\n      </ng-template>\n    </ng-template>\n  </ng-container>\n\n  <ng-container *ngIf=\"footerTemplate\">\n    <ng-template ng-footer-tmp>\n      <ng-template [ngTemplateOutlet]=\"footerTemplate\">\n      </ng-template>\n    </ng-template>\n  </ng-container>\n\n  <ng-container *ngIf=\"notFoundTemplate\">\n    <ng-template ng-notfound-tmp let-searchTerm=\"searchTerm\">\n      <ng-template [ngTemplateOutlet]=\"notFoundTemplate\"\n                   [ngTemplateOutletContext]=\"{ searchTerm: searchTerm }\">\n      </ng-template>\n    </ng-template>\n  </ng-container>\n\n  <ng-container *ngIf=\"typeToSearchTemplate\">\n    <ng-template ng-typetosearch-tmp>\n      <ng-template [ngTemplateOutlet]=\"typeToSearchTemplate\">\n      </ng-template>\n    </ng-template>\n  </ng-container>\n\n  <ng-container *ngIf=\"loadingTextTemplate\">\n    <ng-template ng-loadingtext-tmp let-searchTerm=\"searchTerm\">\n      <ng-template [ngTemplateOutlet]=\"loadingTextTemplate\"\n                   [ngTemplateOutletContext]=\"{ searchTerm: searchTerm }\">\n      </ng-template>\n    </ng-template>\n  </ng-container>\n\n  <ng-container *ngIf=\"tagTemplate\">\n    <ng-template ng-tag-tmp let-searchTerm=\"searchTerm\">\n      <ng-template [ngTemplateOutlet]=\"tagTemplate\"\n                   [ngTemplateOutletContext]=\"{ searchTerm: searchTerm }\">\n      </ng-template>\n    </ng-template>\n  </ng-container>\n\n  <ng-container *ngIf=\"loadingSpinnerTemplate\">\n    <ng-template ng-loadingspinner-tmp>\n      <ng-template [ngTemplateOutlet]=\"loadingSpinnerTemplate\">\n      </ng-template>\n    </ng-template>\n  </ng-container>\n\n</ng-select>\n",
                encapsulation: ViewEncapsulation.None,
                changeDetection: ChangeDetectionStrategy.OnPush,
                providers: [{ provide: MatFormFieldControl, useExisting: MtxSelectComponent }],
                styles: [".ng-select{padding-top:calc(.4375em + .84375em);margin-top:calc(-.4375em - .84375em);padding-bottom:.4375em;margin-bottom:-.4375em}.ng-select .ng-select-container,.ng-select .ng-select-container .ng-value-container{align-items:center}.ng-select .ng-select-container .ng-value-container .ng-input>input{font:inherit;padding:0}.mat-form-field-has-label .ng-select .ng-placeholder{transition:opacity .2s;opacity:0}.mat-form-field-has-label .mtx-select-floating .ng-select .ng-placeholder{opacity:1}.ng-select .ng-has-value .ng-placeholder{display:none}.ng-select.ng-select-opened .ng-arrow-wrapper .ng-arrow{top:-2px;border-width:0 5px 5px}.ng-select.ng-select-single.ng-select-filtered .ng-placeholder{display:inline;display:initial;visibility:hidden}.ng-select.ng-select-single .ng-select-container .ng-value-container .ng-placeholder:after,.ng-select.ng-select-single .ng-select-container .ng-value-container .ng-value:after{display:inline-block;content:\"\"}.ng-select.ng-select-multiple .ng-select-container .ng-value-container{margin:-4px 0}.ng-select.ng-select-multiple .ng-select-container .ng-value-container .ng-value{margin:4px;border-radius:16px;font-size:.875em;line-height:18px}.ng-select.ng-select-multiple .ng-select-container .ng-value-container .ng-value .ng-value-label{display:inline-block;margin:0 8px}.ng-select.ng-select-multiple .ng-select-container .ng-value-container .ng-value .ng-value-icon{display:inline-block;width:18px;height:18px;border-radius:100%;text-align:center}.ng-select.ng-select-multiple .ng-select-container .ng-value-container .ng-value .ng-value-icon.left{margin-right:-4px}[dir=rtl] .ng-select.ng-select-multiple .ng-select-container .ng-value-container .ng-value .ng-value-icon.left{margin-left:-4px;margin-right:auto}.ng-select.ng-select-multiple .ng-select-container .ng-value-container .ng-value .ng-value-icon.right{margin-left:-4px}[dir=rtl] .ng-select.ng-select-multiple .ng-select-container .ng-value-container .ng-value .ng-value-icon.right{margin-right:-4px;margin-left:auto}.ng-select .ng-clear-wrapper{height:18px;text-align:center}.ng-select .ng-arrow-wrapper{width:18px}.ng-select .ng-arrow-wrapper .ng-arrow{border-width:5px 5px 2px;border-style:solid}.ng-dropdown-panel{left:0}[dir=rtl] .ng-dropdown-panel{right:0;left:auto}.ng-dropdown-panel.ng-select-bottom{top:100%;border-bottom-left-radius:4px;border-bottom-right-radius:4px}.ng-dropdown-panel.ng-select-bottom,.ng-dropdown-panel.ng-select-top{box-shadow:0 2px 4px -1px rgba(0,0,0,.2),0 4px 5px 0 rgba(0,0,0,.14),0 1px 10px 0 rgba(0,0,0,.12)}.ng-dropdown-panel.ng-select-top{bottom:100%;border-top-left-radius:4px;border-top-right-radius:4px}.ng-dropdown-panel .ng-dropdown-footer,.ng-dropdown-panel .ng-dropdown-header{padding:14px 16px}.ng-dropdown-panel .ng-dropdown-panel-items .ng-optgroup{height:3em;padding:14px 16px;font-weight:500;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;cursor:pointer}.ng-dropdown-panel .ng-dropdown-panel-items .ng-optgroup.ng-option-disabled{cursor:default}.ng-dropdown-panel .ng-dropdown-panel-items .ng-option{position:relative;padding:14px 16px;text-overflow:ellipsis;text-decoration:none;text-align:left;white-space:nowrap;overflow:hidden}[dir=rtl] .ng-dropdown-panel .ng-dropdown-panel-items .ng-option{text-align:right}.ng-dropdown-panel .ng-dropdown-panel-items .ng-option.ng-option-child{padding-left:32px}[dir=rtl] .ng-dropdown-panel .ng-dropdown-panel-items .ng-option.ng-option-child{padding-right:32px;padding-left:0}.ng-dropdown-panel .ng-dropdown-panel-items .ng-option .ng-tag-label{padding-right:5px;font-size:80%;font-weight:400}[dir=rtl] .ng-dropdown-panel .ng-dropdown-panel-items .ng-option .ng-tag-label{padding-left:5px;padding-right:0}"]
            },] }
];
/** @nocollapse */
MtxSelectComponent.ctorParameters = () => [
    { type: FocusMonitor },
    { type: ElementRef },
    { type: ChangeDetectorRef },
    { type: NgControl, decorators: [{ type: Optional }, { type: Self }] }
];
MtxSelectComponent.propDecorators = {
    ngSelect: [{ type: ViewChild, args: ['ngSelect', { static: true },] }],
    optionTemplate: [{ type: ContentChild, args: [MtxSelectOptionTemplateDirective, { read: TemplateRef },] }],
    optgroupTemplate: [{ type: ContentChild, args: [MtxSelectOptgroupTemplateDirective, { read: TemplateRef },] }],
    labelTemplate: [{ type: ContentChild, args: [MtxSelectLabelTemplateDirective, { read: TemplateRef },] }],
    multiLabelTemplate: [{ type: ContentChild, args: [MtxSelectMultiLabelTemplateDirective, { read: TemplateRef },] }],
    headerTemplate: [{ type: ContentChild, args: [MtxSelectHeaderTemplateDirective, { read: TemplateRef },] }],
    footerTemplate: [{ type: ContentChild, args: [MtxSelectFooterTemplateDirective, { read: TemplateRef },] }],
    notFoundTemplate: [{ type: ContentChild, args: [MtxSelectNotFoundTemplateDirective, { read: TemplateRef },] }],
    typeToSearchTemplate: [{ type: ContentChild, args: [MtxSelectTypeToSearchTemplateDirective, { read: TemplateRef },] }],
    loadingTextTemplate: [{ type: ContentChild, args: [MtxSelectLoadingTextTemplateDirective, { read: TemplateRef },] }],
    tagTemplate: [{ type: ContentChild, args: [MtxSelectTagTemplateDirective, { read: TemplateRef },] }],
    loadingSpinnerTemplate: [{ type: ContentChild, args: [MtxSelectLoadingSpinnerTemplateDirective, { read: TemplateRef },] }],
    mtxOptions: [{ type: ContentChildren, args: [MtxOptionComponent, { descendants: true },] }],
    addTag: [{ type: Input }],
    addTagText: [{ type: Input }],
    appearance: [{ type: Input }],
    appendTo: [{ type: Input }],
    bindLabel: [{ type: Input }],
    bindValue: [{ type: Input }],
    closeOnSelect: [{ type: Input }],
    clearAllText: [{ type: Input }],
    clearable: [{ type: Input }],
    clearOnBackspace: [{ type: Input }],
    compareWith: [{ type: Input }],
    dropdownPosition: [{ type: Input }],
    groupBy: [{ type: Input }],
    groupValue: [{ type: Input }],
    selectableGroup: [{ type: Input }],
    selectableGroupAsModel: [{ type: Input }],
    hideSelected: [{ type: Input }],
    isOpen: [{ type: Input }],
    loading: [{ type: Input }],
    loadingText: [{ type: Input }],
    labelForId: [{ type: Input }],
    markFirst: [{ type: Input }],
    maxSelectedItems: [{ type: Input }],
    multiple: [{ type: Input }],
    notFoundText: [{ type: Input }],
    searchable: [{ type: Input }],
    readonly: [{ type: Input }],
    searchFn: [{ type: Input }],
    searchWhileComposing: [{ type: Input }],
    selectOnTab: [{ type: Input }],
    trackByFn: [{ type: Input }],
    inputAttrs: [{ type: Input }],
    tabIndex: [{ type: Input }],
    openOnEnter: [{ type: Input }],
    minTermLength: [{ type: Input }],
    editableSearchTerm: [{ type: Input }],
    keyDownFn: [{ type: Input }],
    virtualScroll: [{ type: Input }],
    typeToSearchText: [{ type: Input }],
    typeahead: [{ type: Input }],
    blurEvent: [{ type: Output, args: ['blur',] }],
    focusEvent: [{ type: Output, args: ['focus',] }],
    changeEvent: [{ type: Output, args: ['change',] }],
    openEvent: [{ type: Output, args: ['open',] }],
    closeEvent: [{ type: Output, args: ['close',] }],
    searchEvent: [{ type: Output, args: ['search',] }],
    clearEvent: [{ type: Output, args: ['clear',] }],
    addEvent: [{ type: Output, args: ['add',] }],
    removeEvent: [{ type: Output, args: ['remove',] }],
    scroll: [{ type: Output, args: ['scroll',] }],
    scrollToEnd: [{ type: Output, args: ['scrollToEnd',] }],
    clearSearchOnAdd: [{ type: Input }],
    items: [{ type: Input }],
    value: [{ type: Input }],
    id: [{ type: Input }],
    placeholder: [{ type: Input }],
    required: [{ type: Input }],
    disabled: [{ type: Input }]
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VsZWN0LmNvbXBvbmVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3Byb2plY3RzL2V4dGVuc2lvbnMvc2VsZWN0L3NlbGVjdC5jb21wb25lbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUNMLFNBQVMsRUFJVCxpQkFBaUIsRUFDakIsdUJBQXVCLEVBQ3ZCLEtBQUssRUFDTCxVQUFVLEVBQ1YsaUJBQWlCLEVBQ2pCLFFBQVEsRUFDUixJQUFJLEVBQ0osTUFBTSxFQUNOLFlBQVksRUFDWixXQUFXLEVBQ1gsWUFBWSxFQUNaLGVBQWUsRUFDZixTQUFTLEVBRVQsU0FBUyxHQUNWLE1BQU0sZUFBZSxDQUFDO0FBQ3ZCLE9BQU8sRUFBd0IsU0FBUyxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFDakUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDbkUsT0FBTyxFQUFnQixxQkFBcUIsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzVFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUNqRCxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLE1BQU0sQ0FBQztBQUN0QyxPQUFPLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBRXRELE9BQU8sRUFDTCxnQ0FBZ0MsRUFDaEMsK0JBQStCLEVBQy9CLGdDQUFnQyxFQUNoQyxnQ0FBZ0MsRUFDaEMsa0NBQWtDLEVBQ2xDLGtDQUFrQyxFQUNsQyxzQ0FBc0MsRUFDdEMscUNBQXFDLEVBQ3JDLG9DQUFvQyxFQUNwQyw2QkFBNkIsRUFDN0Isd0NBQXdDLEdBQ3pDLE1BQU0sdUJBQXVCLENBQUM7QUFDL0IsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDeEQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFLekQsTUFB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RUFBRSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUU7cUJBSXpELEtBQUs7eUJBQ0wsS0FBSzt5QkFDTCxLQUFLO3VCQUNMLEtBQUs7d0JBQ0wsS0FBSzt3QkFDTCxLQUFLOzRCQUNMLEtBQUs7MkJBQ0wsS0FBSzt3QkFDTCxLQUFLOytCQUNMLEtBQUs7MEJBQ0wsS0FBSzsrQkFDTCxLQUFLO3NCQUNMLEtBQUs7eUJBQ0wsS0FBSzs4QkFDTCxLQUFLO3FDQUNMLEtBQUs7MkJBQ0wsS0FBSztxQkFDTCxLQUFLO3NCQUNMLEtBQUs7MEJBQ0wsS0FBSzt5QkFDTCxLQUFLO3dCQUNMLEtBQUs7K0JBQ0wsS0FBSzt1QkFDTCxLQUFLOzJCQUNMLEtBQUs7eUJBQ0wsS0FBSzt1QkFDTCxLQUFLO3VCQUNMLEtBQUs7bUNBQ0wsS0FBSzswQkFDTCxLQUFLO3dCQUNMLEtBQUs7eUJBQ0wsS0FBSzt1QkFDTCxLQUFLOzBCQUNMLEtBQUs7NEJBQ0wsS0FBSztpQ0FDTCxLQUFLO3dCQUNMLEtBQUs7NEJBQ0wsS0FBSzsrQkFDTCxLQUFLO3dCQUNMLEtBQUs7d0JBRUwsTUFBTSxTQUFDLE1BQU07eUJBQ2IsTUFBTSxTQUFDLE9BQU87MEJBQ2QsTUFBTSxTQUFDLFFBQVE7d0JBQ2YsTUFBTSxTQUFDLE1BQU07eUJBQ2IsTUFBTSxTQUFDLE9BQU87MEJBQ2QsTUFBTSxTQUFDLFFBQVE7eUJBQ2YsTUFBTSxTQUFDLE9BQU87dUJBQ2QsTUFBTSxTQUFDLEtBQUs7MEJBQ1osTUFBTSxTQUFDLFFBQVE7cUJBQ2YsTUFBTSxTQUFDLFFBQVE7MEJBQ2YsTUFBTSxTQUFDLGFBQWE7K0JBRXBCLEtBQUs7b0JBU0wsS0FBSztvQkFhTCxLQUFLO2lCQWVMLEtBQUs7MEJBY0wsS0FBSzt1QkF3QkwsS0FBSzt1QkFVTCxLQUFLIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcbiAgQ29tcG9uZW50LFxuICBPbkluaXQsXG4gIE9uRGVzdHJveSxcbiAgRG9DaGVjayxcbiAgVmlld0VuY2Fwc3VsYXRpb24sXG4gIENoYW5nZURldGVjdGlvblN0cmF0ZWd5LFxuICBJbnB1dCxcbiAgRWxlbWVudFJlZixcbiAgQ2hhbmdlRGV0ZWN0b3JSZWYsXG4gIE9wdGlvbmFsLFxuICBTZWxmLFxuICBPdXRwdXQsXG4gIEV2ZW50RW1pdHRlcixcbiAgVGVtcGxhdGVSZWYsXG4gIENvbnRlbnRDaGlsZCxcbiAgQ29udGVudENoaWxkcmVuLFxuICBRdWVyeUxpc3QsXG4gIEFmdGVyVmlld0luaXQsXG4gIFZpZXdDaGlsZCxcbn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBDb250cm9sVmFsdWVBY2Nlc3NvciwgTmdDb250cm9sIH0gZnJvbSAnQGFuZ3VsYXIvZm9ybXMnO1xuaW1wb3J0IHsgTWF0Rm9ybUZpZWxkQ29udHJvbCB9IGZyb20gJ0Bhbmd1bGFyL21hdGVyaWFsL2Zvcm0tZmllbGQnO1xuaW1wb3J0IHsgQm9vbGVhbklucHV0LCBjb2VyY2VCb29sZWFuUHJvcGVydHkgfSBmcm9tICdAYW5ndWxhci9jZGsvY29lcmNpb24nO1xuaW1wb3J0IHsgRm9jdXNNb25pdG9yIH0gZnJvbSAnQGFuZ3VsYXIvY2RrL2ExMXknO1xuaW1wb3J0IHsgU3ViamVjdCwgbWVyZ2UgfSBmcm9tICdyeGpzJztcbmltcG9ydCB7IHRha2VVbnRpbCwgc3RhcnRXaXRoIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5pbXBvcnQge1xuICBNdHhTZWxlY3RPcHRpb25UZW1wbGF0ZURpcmVjdGl2ZSxcbiAgTXR4U2VsZWN0TGFiZWxUZW1wbGF0ZURpcmVjdGl2ZSxcbiAgTXR4U2VsZWN0SGVhZGVyVGVtcGxhdGVEaXJlY3RpdmUsXG4gIE10eFNlbGVjdEZvb3RlclRlbXBsYXRlRGlyZWN0aXZlLFxuICBNdHhTZWxlY3RPcHRncm91cFRlbXBsYXRlRGlyZWN0aXZlLFxuICBNdHhTZWxlY3ROb3RGb3VuZFRlbXBsYXRlRGlyZWN0aXZlLFxuICBNdHhTZWxlY3RUeXBlVG9TZWFyY2hUZW1wbGF0ZURpcmVjdGl2ZSxcbiAgTXR4U2VsZWN0TG9hZGluZ1RleHRUZW1wbGF0ZURpcmVjdGl2ZSxcbiAgTXR4U2VsZWN0TXVsdGlMYWJlbFRlbXBsYXRlRGlyZWN0aXZlLFxuICBNdHhTZWxlY3RUYWdUZW1wbGF0ZURpcmVjdGl2ZSxcbiAgTXR4U2VsZWN0TG9hZGluZ1NwaW5uZXJUZW1wbGF0ZURpcmVjdGl2ZSxcbn0gZnJvbSAnLi90ZW1wbGF0ZXMuZGlyZWN0aXZlJztcbmltcG9ydCB7IE10eE9wdGlvbkNvbXBvbmVudCB9IGZyb20gJy4vb3B0aW9uLmNvbXBvbmVudCc7XG5pbXBvcnQgeyBOZ1NlbGVjdENvbXBvbmVudCB9IGZyb20gJ0BuZy1zZWxlY3Qvbmctc2VsZWN0JztcblxuZXhwb3J0IHR5cGUgQ29tcGFyZVdpdGhGbiA9IChhOiBhbnksIGI6IGFueSkgPT4gYm9vbGVhbjtcbmV4cG9ydCB0eXBlIEdyb3VwVmFsdWVGbiA9IChrZXk6IHN0cmluZyB8IG9iamVjdCwgY2hpbGRyZW46IGFueVtdKSA9PiBzdHJpbmcgfCBvYmplY3Q7XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0RlZmluZWQodmFsdWU6IGFueSkge1xuICByZXR1cm4gdmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbDtcbn1cblxubGV0IG5leHRVbmlxdWVJZCA9IDA7XG5cbkBDb21wb25lbnQoe1xuICBzZWxlY3RvcjogJ210eC1zZWxlY3QnLFxuICBleHBvcnRBczogJ210eFNlbGVjdCcsXG4gIGhvc3Q6IHtcbiAgICAnW2F0dHIuaWRdJzogJ2lkJyxcbiAgICAnW2F0dHIuYXJpYS1kZXNjcmliZWRieV0nOiAnX2FyaWFEZXNjcmliZWRieSB8fCBudWxsJyxcbiAgICAnW2NsYXNzLm10eC1zZWxlY3QtZmxvYXRpbmddJzogJ3Nob3VsZExhYmVsRmxvYXQnLFxuICAgICdbY2xhc3MubXR4LXNlbGVjdC1pbnZhbGlkXSc6ICdlcnJvclN0YXRlJyxcbiAgICAnY2xhc3MnOiAnbXR4LXNlbGVjdCcsXG4gIH0sXG4gIHRlbXBsYXRlVXJsOiAnLi9zZWxlY3QuY29tcG9uZW50Lmh0bWwnLFxuICBzdHlsZVVybHM6IFsnLi9zZWxlY3QuY29tcG9uZW50LnNjc3MnXSxcbiAgZW5jYXBzdWxhdGlvbjogVmlld0VuY2Fwc3VsYXRpb24uTm9uZSxcbiAgY2hhbmdlRGV0ZWN0aW9uOiBDaGFuZ2VEZXRlY3Rpb25TdHJhdGVneS5PblB1c2gsXG4gIHByb3ZpZGVyczogW3sgcHJvdmlkZTogTWF0Rm9ybUZpZWxkQ29udHJvbCwgdXNlRXhpc3Rpbmc6IE10eFNlbGVjdENvbXBvbmVudCB9XSxcbn0pXG5leHBvcnQgY2xhc3MgTXR4U2VsZWN0Q29tcG9uZW50XG4gIGltcGxlbWVudHNcbiAgICBPbkluaXQsXG4gICAgT25EZXN0cm95LFxuICAgIERvQ2hlY2ssXG4gICAgQWZ0ZXJWaWV3SW5pdCxcbiAgICBDb250cm9sVmFsdWVBY2Nlc3NvcixcbiAgICBNYXRGb3JtRmllbGRDb250cm9sPGFueT4ge1xuICBAVmlld0NoaWxkKCduZ1NlbGVjdCcsIHsgc3RhdGljOiB0cnVlIH0pIG5nU2VsZWN0ITogTmdTZWxlY3RDb21wb25lbnQ7XG5cbiAgLy8gTXR4U2VsZWN0IGN1c3RvbSB0ZW1wbGF0ZXNcbiAgQENvbnRlbnRDaGlsZChNdHhTZWxlY3RPcHRpb25UZW1wbGF0ZURpcmVjdGl2ZSwgeyByZWFkOiBUZW1wbGF0ZVJlZiB9KVxuICBvcHRpb25UZW1wbGF0ZSE6IFRlbXBsYXRlUmVmPGFueT47XG4gIEBDb250ZW50Q2hpbGQoTXR4U2VsZWN0T3B0Z3JvdXBUZW1wbGF0ZURpcmVjdGl2ZSwgeyByZWFkOiBUZW1wbGF0ZVJlZiB9KVxuICBvcHRncm91cFRlbXBsYXRlITogVGVtcGxhdGVSZWY8YW55PjtcbiAgQENvbnRlbnRDaGlsZChNdHhTZWxlY3RMYWJlbFRlbXBsYXRlRGlyZWN0aXZlLCB7IHJlYWQ6IFRlbXBsYXRlUmVmIH0pXG4gIGxhYmVsVGVtcGxhdGUhOiBUZW1wbGF0ZVJlZjxhbnk+O1xuICBAQ29udGVudENoaWxkKE10eFNlbGVjdE11bHRpTGFiZWxUZW1wbGF0ZURpcmVjdGl2ZSwgeyByZWFkOiBUZW1wbGF0ZVJlZiB9KVxuICBtdWx0aUxhYmVsVGVtcGxhdGUhOiBUZW1wbGF0ZVJlZjxhbnk+O1xuICBAQ29udGVudENoaWxkKE10eFNlbGVjdEhlYWRlclRlbXBsYXRlRGlyZWN0aXZlLCB7IHJlYWQ6IFRlbXBsYXRlUmVmIH0pXG4gIGhlYWRlclRlbXBsYXRlITogVGVtcGxhdGVSZWY8YW55PjtcbiAgQENvbnRlbnRDaGlsZChNdHhTZWxlY3RGb290ZXJUZW1wbGF0ZURpcmVjdGl2ZSwgeyByZWFkOiBUZW1wbGF0ZVJlZiB9KVxuICBmb290ZXJUZW1wbGF0ZSE6IFRlbXBsYXRlUmVmPGFueT47XG4gIEBDb250ZW50Q2hpbGQoTXR4U2VsZWN0Tm90Rm91bmRUZW1wbGF0ZURpcmVjdGl2ZSwgeyByZWFkOiBUZW1wbGF0ZVJlZiB9KVxuICBub3RGb3VuZFRlbXBsYXRlITogVGVtcGxhdGVSZWY8YW55PjtcbiAgQENvbnRlbnRDaGlsZChNdHhTZWxlY3RUeXBlVG9TZWFyY2hUZW1wbGF0ZURpcmVjdGl2ZSwgeyByZWFkOiBUZW1wbGF0ZVJlZiB9KVxuICB0eXBlVG9TZWFyY2hUZW1wbGF0ZSE6IFRlbXBsYXRlUmVmPGFueT47XG4gIEBDb250ZW50Q2hpbGQoTXR4U2VsZWN0TG9hZGluZ1RleHRUZW1wbGF0ZURpcmVjdGl2ZSwgeyByZWFkOiBUZW1wbGF0ZVJlZiB9KVxuICBsb2FkaW5nVGV4dFRlbXBsYXRlITogVGVtcGxhdGVSZWY8YW55PjtcbiAgQENvbnRlbnRDaGlsZChNdHhTZWxlY3RUYWdUZW1wbGF0ZURpcmVjdGl2ZSwgeyByZWFkOiBUZW1wbGF0ZVJlZiB9KSB0YWdUZW1wbGF0ZSE6IFRlbXBsYXRlUmVmPGFueT47XG4gIEBDb250ZW50Q2hpbGQoTXR4U2VsZWN0TG9hZGluZ1NwaW5uZXJUZW1wbGF0ZURpcmVjdGl2ZSwgeyByZWFkOiBUZW1wbGF0ZVJlZiB9KVxuICBsb2FkaW5nU3Bpbm5lclRlbXBsYXRlITogVGVtcGxhdGVSZWY8YW55PjtcblxuICBAQ29udGVudENoaWxkcmVuKE10eE9wdGlvbkNvbXBvbmVudCwgeyBkZXNjZW5kYW50czogdHJ1ZSB9KVxuICBtdHhPcHRpb25zITogUXVlcnlMaXN0PE10eE9wdGlvbkNvbXBvbmVudD47XG5cbiAgLyoqIE10eFNlbGVjdCBvcHRpb25zICovXG4gIEBJbnB1dCgpIGFkZFRhZzogYm9vbGVhbiB8ICgodGVybTogc3RyaW5nKSA9PiBhbnkgfCBQcm9taXNlPGFueT4pID0gZmFsc2U7XG4gIEBJbnB1dCgpIGFkZFRhZ1RleHQgPSAnQWRkIGl0ZW0nO1xuICBASW5wdXQoKSBhcHBlYXJhbmNlID0gJ3VuZGVybGluZSc7XG4gIEBJbnB1dCgpIGFwcGVuZFRvITogc3RyaW5nO1xuICBASW5wdXQoKSBiaW5kTGFiZWwhOiBzdHJpbmc7XG4gIEBJbnB1dCgpIGJpbmRWYWx1ZSE6IHN0cmluZztcbiAgQElucHV0KCkgY2xvc2VPblNlbGVjdCA9IHRydWU7XG4gIEBJbnB1dCgpIGNsZWFyQWxsVGV4dCA9ICdDbGVhciBhbGwnO1xuICBASW5wdXQoKSBjbGVhcmFibGUgPSB0cnVlO1xuICBASW5wdXQoKSBjbGVhck9uQmFja3NwYWNlID0gdHJ1ZTtcbiAgQElucHV0KCkgY29tcGFyZVdpdGghOiBDb21wYXJlV2l0aEZuO1xuICBASW5wdXQoKSBkcm9wZG93blBvc2l0aW9uOiAnYm90dG9tJyB8ICd0b3AnIHwgJ2F1dG8nID0gJ2F1dG8nO1xuICBASW5wdXQoKSBncm91cEJ5ITogc3RyaW5nIHwgKCgpID0+IHZvaWQpO1xuICBASW5wdXQoKSBncm91cFZhbHVlITogR3JvdXBWYWx1ZUZuO1xuICBASW5wdXQoKSBzZWxlY3RhYmxlR3JvdXAgPSBmYWxzZTtcbiAgQElucHV0KCkgc2VsZWN0YWJsZUdyb3VwQXNNb2RlbCA9IHRydWU7XG4gIEBJbnB1dCgpIGhpZGVTZWxlY3RlZCA9IGZhbHNlO1xuICBASW5wdXQoKSBpc09wZW4hOiBib29sZWFuO1xuICBASW5wdXQoKSBsb2FkaW5nID0gZmFsc2U7XG4gIEBJbnB1dCgpIGxvYWRpbmdUZXh0ID0gJ0xvYWRpbmcuLi4nO1xuICBASW5wdXQoKSBsYWJlbEZvcklkID0gbnVsbDtcbiAgQElucHV0KCkgbWFya0ZpcnN0ID0gdHJ1ZTtcbiAgQElucHV0KCkgbWF4U2VsZWN0ZWRJdGVtcyE6IG51bWJlcjtcbiAgQElucHV0KCkgbXVsdGlwbGUgPSBmYWxzZTtcbiAgQElucHV0KCkgbm90Rm91bmRUZXh0ID0gJ05vIGl0ZW1zIGZvdW5kJztcbiAgQElucHV0KCkgc2VhcmNoYWJsZSA9IHRydWU7XG4gIEBJbnB1dCgpIHJlYWRvbmx5ID0gZmFsc2U7XG4gIEBJbnB1dCgpIHNlYXJjaEZuID0gbnVsbDtcbiAgQElucHV0KCkgc2VhcmNoV2hpbGVDb21wb3NpbmcgPSB0cnVlO1xuICBASW5wdXQoKSBzZWxlY3RPblRhYiA9IGZhbHNlO1xuICBASW5wdXQoKSB0cmFja0J5Rm4gPSBudWxsO1xuICBASW5wdXQoKSBpbnB1dEF0dHJzOiB7IFtrZXk6IHN0cmluZ106IHN0cmluZyB9ID0ge307XG4gIEBJbnB1dCgpIHRhYkluZGV4ITogbnVtYmVyO1xuICBASW5wdXQoKSBvcGVuT25FbnRlciE6IGJvb2xlYW47XG4gIEBJbnB1dCgpIG1pblRlcm1MZW5ndGggPSAwO1xuICBASW5wdXQoKSBlZGl0YWJsZVNlYXJjaFRlcm0gPSBmYWxzZTtcbiAgQElucHV0KCkga2V5RG93bkZuID0gKF86IEtleWJvYXJkRXZlbnQpID0+IHRydWU7XG4gIEBJbnB1dCgpIHZpcnR1YWxTY3JvbGwgPSBmYWxzZTtcbiAgQElucHV0KCkgdHlwZVRvU2VhcmNoVGV4dCA9ICdUeXBlIHRvIHNlYXJjaCc7XG4gIEBJbnB1dCgpIHR5cGVhaGVhZCE6IFN1YmplY3Q8c3RyaW5nPjtcblxuICBAT3V0cHV0KCdibHVyJykgYmx1ckV2ZW50ID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuICBAT3V0cHV0KCdmb2N1cycpIGZvY3VzRXZlbnQgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG4gIEBPdXRwdXQoJ2NoYW5nZScpIGNoYW5nZUV2ZW50ID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuICBAT3V0cHV0KCdvcGVuJykgb3BlbkV2ZW50ID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuICBAT3V0cHV0KCdjbG9zZScpIGNsb3NlRXZlbnQgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG4gIEBPdXRwdXQoJ3NlYXJjaCcpIHNlYXJjaEV2ZW50ID0gbmV3IEV2ZW50RW1pdHRlcjx7IHRlcm06IHN0cmluZzsgaXRlbXM6IGFueVtdIH0+KCk7XG4gIEBPdXRwdXQoJ2NsZWFyJykgY2xlYXJFdmVudCA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcbiAgQE91dHB1dCgnYWRkJykgYWRkRXZlbnQgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG4gIEBPdXRwdXQoJ3JlbW92ZScpIHJlbW92ZUV2ZW50ID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuICBAT3V0cHV0KCdzY3JvbGwnKSBzY3JvbGwgPSBuZXcgRXZlbnRFbWl0dGVyPHsgc3RhcnQ6IG51bWJlcjsgZW5kOiBudW1iZXIgfT4oKTtcbiAgQE91dHB1dCgnc2Nyb2xsVG9FbmQnKSBzY3JvbGxUb0VuZCA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcblxuICBASW5wdXQoKVxuICBnZXQgY2xlYXJTZWFyY2hPbkFkZCgpIHtcbiAgICByZXR1cm4gaXNEZWZpbmVkKHRoaXMuX2NsZWFyU2VhcmNoT25BZGQpID8gdGhpcy5fY2xlYXJTZWFyY2hPbkFkZCA6IHRoaXMuY2xvc2VPblNlbGVjdDtcbiAgfVxuICBzZXQgY2xlYXJTZWFyY2hPbkFkZCh2YWx1ZSkge1xuICAgIHRoaXMuX2NsZWFyU2VhcmNoT25BZGQgPSB2YWx1ZTtcbiAgfVxuICBwcml2YXRlIF9jbGVhclNlYXJjaE9uQWRkITogYm9vbGVhbjtcblxuICBASW5wdXQoKVxuICBnZXQgaXRlbXMoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2l0ZW1zO1xuICB9XG4gIHNldCBpdGVtcyh2YWx1ZTogYW55W10pIHtcbiAgICB0aGlzLl9pdGVtc0FyZVVzZWQgPSB0cnVlO1xuICAgIHRoaXMuX2l0ZW1zID0gdmFsdWU7XG4gIH1cbiAgcHJpdmF0ZSBfaXRlbXM6IGFueVtdID0gW107XG4gIHByaXZhdGUgX2l0ZW1zQXJlVXNlZCE6IGJvb2xlYW47XG4gIHByaXZhdGUgcmVhZG9ubHkgX2Rlc3Ryb3kkID0gbmV3IFN1YmplY3Q8dm9pZD4oKTtcblxuICAvKiogVmFsdWUgb2YgdGhlIHNlbGVjdCBjb250cm9sLiAqL1xuICBASW5wdXQoKVxuICBnZXQgdmFsdWUoKTogYW55IHtcbiAgICByZXR1cm4gdGhpcy5fdmFsdWU7XG4gIH1cbiAgc2V0IHZhbHVlKG5ld1ZhbHVlOiBhbnkpIHtcbiAgICB0aGlzLl92YWx1ZSA9IG5ld1ZhbHVlO1xuICAgIHRoaXMuX29uQ2hhbmdlKG5ld1ZhbHVlKTtcbiAgICB0aGlzLnN0YXRlQ2hhbmdlcy5uZXh0KCk7XG4gIH1cbiAgcHJpdmF0ZSBfdmFsdWUgPSBudWxsO1xuXG4gIC8qKiBJbXBsZW1lbnRlZCBhcyBwYXJ0IG9mIE1hdEZvcm1GaWVsZENvbnRyb2wuICovXG4gIHJlYWRvbmx5IHN0YXRlQ2hhbmdlczogU3ViamVjdDx2b2lkPiA9IG5ldyBTdWJqZWN0PHZvaWQ+KCk7XG5cbiAgLyoqIFVuaXF1ZSBpZCBvZiB0aGUgZWxlbWVudC4gKi9cbiAgQElucHV0KClcbiAgZ2V0IGlkKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuX2lkO1xuICB9XG4gIHNldCBpZCh2YWx1ZTogc3RyaW5nKSB7XG4gICAgdGhpcy5faWQgPSB2YWx1ZSB8fCB0aGlzLl91aWQ7XG4gICAgdGhpcy5zdGF0ZUNoYW5nZXMubmV4dCgpO1xuICB9XG4gIHByaXZhdGUgX2lkITogc3RyaW5nO1xuXG4gIC8qKiBVbmlxdWUgaWQgZm9yIHRoaXMgaW5wdXQuICovXG4gIHByaXZhdGUgX3VpZCA9IGBtdHgtc2VsZWN0LSR7bmV4dFVuaXF1ZUlkKyt9YDtcblxuICAvKiogUGxhY2Vob2xkZXIgdG8gYmUgc2hvd24gaWYgdmFsdWUgaXMgZW1wdHkuICovXG4gIEBJbnB1dCgpXG4gIGdldCBwbGFjZWhvbGRlcigpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLl9wbGFjZWhvbGRlcjtcbiAgfVxuICBzZXQgcGxhY2Vob2xkZXIodmFsdWU6IHN0cmluZykge1xuICAgIHRoaXMuX3BsYWNlaG9sZGVyID0gdmFsdWU7XG4gICAgdGhpcy5zdGF0ZUNoYW5nZXMubmV4dCgpO1xuICB9XG4gIHByaXZhdGUgX3BsYWNlaG9sZGVyITogc3RyaW5nO1xuXG4gIC8qKiBXaGV0aGVyIHRoZSBpbnB1dCBpcyBmb2N1c2VkLiAqL1xuICBnZXQgZm9jdXNlZCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5fZm9jdXNlZDtcbiAgfVxuICBwcml2YXRlIF9mb2N1c2VkID0gZmFsc2U7XG5cbiAgZ2V0IGVtcHR5KCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnZhbHVlID09IG51bGwgfHwgKEFycmF5LmlzQXJyYXkodGhpcy52YWx1ZSkgJiYgdGhpcy52YWx1ZS5sZW5ndGggPT09IDApO1xuICB9XG5cbiAgZ2V0IHNob3VsZExhYmVsRmxvYXQoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuZm9jdXNlZCB8fCAhdGhpcy5lbXB0eTtcbiAgfVxuXG4gIEBJbnB1dCgpXG4gIGdldCByZXF1aXJlZCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5fcmVxdWlyZWQ7XG4gIH1cbiAgc2V0IHJlcXVpcmVkKHZhbHVlOiBib29sZWFuKSB7XG4gICAgdGhpcy5fcmVxdWlyZWQgPSBjb2VyY2VCb29sZWFuUHJvcGVydHkodmFsdWUpO1xuICAgIHRoaXMuc3RhdGVDaGFuZ2VzLm5leHQoKTtcbiAgfVxuICBwcml2YXRlIF9yZXF1aXJlZCA9IGZhbHNlO1xuXG4gIEBJbnB1dCgpXG4gIGdldCBkaXNhYmxlZCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5fZGlzYWJsZWQ7XG4gIH1cbiAgc2V0IGRpc2FibGVkKHZhbHVlOiBib29sZWFuKSB7XG4gICAgdGhpcy5fZGlzYWJsZWQgPSBjb2VyY2VCb29sZWFuUHJvcGVydHkodmFsdWUpO1xuICAgIHRoaXMucmVhZG9ubHkgPSB0aGlzLl9kaXNhYmxlZDtcbiAgICB0aGlzLnN0YXRlQ2hhbmdlcy5uZXh0KCk7XG4gIH1cbiAgcHJpdmF0ZSBfZGlzYWJsZWQgPSBmYWxzZTtcblxuICBlcnJvclN0YXRlID0gZmFsc2U7XG5cbiAgLyoqIEEgbmFtZSBmb3IgdGhpcyBjb250cm9sIHRoYXQgY2FuIGJlIHVzZWQgYnkgYG1hdC1mb3JtLWZpZWxkYC4gKi9cbiAgY29udHJvbFR5cGUgPSAnbXR4LXNlbGVjdCc7XG5cbiAgLyoqIFRoZSBhcmlhLWRlc2NyaWJlZGJ5IGF0dHJpYnV0ZSBvbiB0aGUgc2VsZWN0IGZvciBpbXByb3ZlZCBhMTF5LiAqL1xuICBfYXJpYURlc2NyaWJlZGJ5ITogc3RyaW5nO1xuXG4gIC8qKiBgVmlldyAtPiBtb2RlbCBjYWxsYmFjayBjYWxsZWQgd2hlbiB2YWx1ZSBjaGFuZ2VzYCAqL1xuICBfb25DaGFuZ2U6ICh2YWx1ZTogYW55KSA9PiB2b2lkID0gKCkgPT4ge307XG5cbiAgLyoqIGBWaWV3IC0+IG1vZGVsIGNhbGxiYWNrIGNhbGxlZCB3aGVuIHNlbGVjdCBoYXMgYmVlbiB0b3VjaGVkYCAqL1xuICBfb25Ub3VjaGVkID0gKCkgPT4ge307XG5cbiAgY29uc3RydWN0b3IoXG4gICAgcHJpdmF0ZSBfZm9jdXNNb25pdG9yOiBGb2N1c01vbml0b3IsXG4gICAgcHJpdmF0ZSBfZWxlbWVudFJlZjogRWxlbWVudFJlZjxIVE1MRWxlbWVudD4sXG4gICAgcHJpdmF0ZSBfY2hhbmdlRGV0ZWN0b3JSZWY6IENoYW5nZURldGVjdG9yUmVmLFxuICAgIEBPcHRpb25hbCgpIEBTZWxmKCkgcHVibGljIG5nQ29udHJvbDogTmdDb250cm9sXG4gICkge1xuICAgIF9mb2N1c01vbml0b3IubW9uaXRvcihfZWxlbWVudFJlZiwgdHJ1ZSkuc3Vic2NyaWJlKG9yaWdpbiA9PiB7XG4gICAgICBpZiAodGhpcy5fZm9jdXNlZCAmJiAhb3JpZ2luKSB7XG4gICAgICAgIHRoaXMuX29uVG91Y2hlZCgpO1xuICAgICAgfVxuICAgICAgdGhpcy5fZm9jdXNlZCA9ICEhb3JpZ2luO1xuICAgICAgdGhpcy5zdGF0ZUNoYW5nZXMubmV4dCgpO1xuICAgIH0pO1xuXG4gICAgaWYgKHRoaXMubmdDb250cm9sICE9IG51bGwpIHtcbiAgICAgIHRoaXMubmdDb250cm9sLnZhbHVlQWNjZXNzb3IgPSB0aGlzO1xuICAgIH1cbiAgfVxuXG4gIG5nT25Jbml0KCkge1xuICAgIC8vIEZpeCBjb21wYXJlV2l0aCB3YXJuaW5nIG9mIHVuZGVmaW5lZCB2YWx1ZVxuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9uZy1zZWxlY3Qvbmctc2VsZWN0L2lzc3Vlcy8xNTM3XG4gICAgaWYgKHRoaXMuY29tcGFyZVdpdGgpIHtcbiAgICAgIHRoaXMubmdTZWxlY3QuY29tcGFyZVdpdGggPSB0aGlzLmNvbXBhcmVXaXRoO1xuICAgIH1cbiAgfVxuXG4gIG5nQWZ0ZXJWaWV3SW5pdCgpIHtcbiAgICBpZiAoIXRoaXMuX2l0ZW1zQXJlVXNlZCkge1xuICAgICAgdGhpcy5fc2V0SXRlbXNGcm9tTXR4T3B0aW9ucygpO1xuICAgIH1cbiAgfVxuXG4gIG5nRG9DaGVjaygpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5uZ0NvbnRyb2wpIHtcbiAgICAgIHRoaXMuZXJyb3JTdGF0ZSA9ICh0aGlzLm5nQ29udHJvbC5pbnZhbGlkICYmIHRoaXMubmdDb250cm9sLnRvdWNoZWQpIGFzIGJvb2xlYW47XG4gICAgICB0aGlzLnN0YXRlQ2hhbmdlcy5uZXh0KCk7XG4gICAgfVxuICB9XG5cbiAgbmdPbkRlc3Ryb3koKSB7XG4gICAgdGhpcy5fZGVzdHJveSQubmV4dCgpO1xuICAgIHRoaXMuX2Rlc3Ryb3kkLmNvbXBsZXRlKCk7XG4gICAgdGhpcy5zdGF0ZUNoYW5nZXMuY29tcGxldGUoKTtcbiAgICB0aGlzLl9mb2N1c01vbml0b3Iuc3RvcE1vbml0b3JpbmcodGhpcy5fZWxlbWVudFJlZik7XG4gIH1cblxuICAvKiogSW1wbGVtZW50ZWQgYXMgcGFydCBvZiBNYXRGb3JtRmllbGRDb250cm9sLiAqL1xuICBzZXREZXNjcmliZWRCeUlkcyhpZHM6IHN0cmluZ1tdKSB7XG4gICAgdGhpcy5fYXJpYURlc2NyaWJlZGJ5ID0gaWRzLmpvaW4oJyAnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEaXNhYmxlcyB0aGUgc2VsZWN0LiBQYXJ0IG9mIHRoZSBDb250cm9sVmFsdWVBY2Nlc3NvciBpbnRlcmZhY2UgcmVxdWlyZWRcbiAgICogdG8gaW50ZWdyYXRlIHdpdGggQW5ndWxhcidzIGNvcmUgZm9ybXMgQVBJLlxuICAgKlxuICAgKiBAcGFyYW0gaXNEaXNhYmxlZCBTZXRzIHdoZXRoZXIgdGhlIGNvbXBvbmVudCBpcyBkaXNhYmxlZC5cbiAgICovXG4gIHNldERpc2FibGVkU3RhdGUoaXNEaXNhYmxlZDogYm9vbGVhbikge1xuICAgIHRoaXMuZGlzYWJsZWQgPSBpc0Rpc2FibGVkO1xuICB9XG5cbiAgLyoqIEltcGxlbWVudGVkIGFzIHBhcnQgb2YgTWF0Rm9ybUZpZWxkQ29udHJvbC4gKi9cbiAgb25Db250YWluZXJDbGljayhldmVudDogTW91c2VFdmVudCkge1xuICAgIGNvbnN0IHRhcmdldCA9IGV2ZW50LnRhcmdldCBhcyBIVE1MRWxlbWVudDtcbiAgICBpZiAoL21hdC1mb3JtLWZpZWxkfG10eC1zZWxlY3QvZy50ZXN0KHRhcmdldC5wYXJlbnRFbGVtZW50Py5jbGFzc0xpc3RbMF0gfHwgJycpKSB7XG4gICAgICB0aGlzLmZvY3VzKCk7XG4gICAgICB0aGlzLm9wZW4oKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB0aGUgc2VsZWN0J3MgdmFsdWUuIFBhcnQgb2YgdGhlIENvbnRyb2xWYWx1ZUFjY2Vzc29yIGludGVyZmFjZVxuICAgKiByZXF1aXJlZCB0byBpbnRlZ3JhdGUgd2l0aCBBbmd1bGFyJ3MgY29yZSBmb3JtcyBBUEkuXG4gICAqXG4gICAqIEBwYXJhbSB2YWx1ZSBOZXcgdmFsdWUgdG8gYmUgd3JpdHRlbiB0byB0aGUgbW9kZWwuXG4gICAqL1xuICB3cml0ZVZhbHVlKHZhbHVlOiBhbnkpOiB2b2lkIHtcbiAgICB0aGlzLnZhbHVlID0gdmFsdWU7XG4gICAgdGhpcy5fY2hhbmdlRGV0ZWN0b3JSZWYubWFya0ZvckNoZWNrKCk7XG4gIH1cblxuICAvKipcbiAgICogU2F2ZXMgYSBjYWxsYmFjayBmdW5jdGlvbiB0byBiZSBpbnZva2VkIHdoZW4gdGhlIHNlbGVjdCdzIHZhbHVlXG4gICAqIGNoYW5nZXMgZnJvbSB1c2VyIGlucHV0LiBQYXJ0IG9mIHRoZSBDb250cm9sVmFsdWVBY2Nlc3NvciBpbnRlcmZhY2VcbiAgICogcmVxdWlyZWQgdG8gaW50ZWdyYXRlIHdpdGggQW5ndWxhcidzIGNvcmUgZm9ybXMgQVBJLlxuICAgKlxuICAgKiBAcGFyYW0gZm4gQ2FsbGJhY2sgdG8gYmUgdHJpZ2dlcmVkIHdoZW4gdGhlIHZhbHVlIGNoYW5nZXMuXG4gICAqL1xuICByZWdpc3Rlck9uQ2hhbmdlKGZuOiBhbnkpOiB2b2lkIHtcbiAgICB0aGlzLl9vbkNoYW5nZSA9IGZuO1xuICB9XG5cbiAgLyoqXG4gICAqIFNhdmVzIGEgY2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgaW52b2tlZCB3aGVuIHRoZSBzZWxlY3QgaXMgYmx1cnJlZFxuICAgKiBieSB0aGUgdXNlci4gUGFydCBvZiB0aGUgQ29udHJvbFZhbHVlQWNjZXNzb3IgaW50ZXJmYWNlIHJlcXVpcmVkXG4gICAqIHRvIGludGVncmF0ZSB3aXRoIEFuZ3VsYXIncyBjb3JlIGZvcm1zIEFQSS5cbiAgICpcbiAgICogQHBhcmFtIGZuIENhbGxiYWNrIHRvIGJlIHRyaWdnZXJlZCB3aGVuIHRoZSBjb21wb25lbnQgaGFzIGJlZW4gdG91Y2hlZC5cbiAgICovXG4gIHJlZ2lzdGVyT25Ub3VjaGVkKGZuOiBhbnkpOiB2b2lkIHtcbiAgICB0aGlzLl9vblRvdWNoZWQgPSBmbjtcbiAgfVxuXG4gIC8qKiBOZ1NlbGVjdDogX3NldEl0ZW1zRnJvbU5nT3B0aW9ucyAqL1xuXG4gIHByaXZhdGUgX3NldEl0ZW1zRnJvbU10eE9wdGlvbnMoKSB7XG4gICAgY29uc3QgbWFwTXR4T3B0aW9ucyA9IChvcHRpb25zOiBRdWVyeUxpc3Q8TXR4T3B0aW9uQ29tcG9uZW50PikgPT4ge1xuICAgICAgdGhpcy5pdGVtcyA9IG9wdGlvbnMubWFwKG9wdGlvbiA9PiAoe1xuICAgICAgICAkbmdPcHRpb25WYWx1ZTogb3B0aW9uLnZhbHVlLFxuICAgICAgICAkbmdPcHRpb25MYWJlbDogb3B0aW9uLmVsZW1lbnRSZWYubmF0aXZlRWxlbWVudC5pbm5lckhUTUwsXG4gICAgICAgIGRpc2FibGVkOiBvcHRpb24uZGlzYWJsZWQsXG4gICAgICB9KSk7XG4gICAgICB0aGlzLm5nU2VsZWN0Lml0ZW1zTGlzdC5zZXRJdGVtcyh0aGlzLml0ZW1zKTtcbiAgICAgIGlmICh0aGlzLm5nU2VsZWN0Lmhhc1ZhbHVlKSB7XG4gICAgICAgIHRoaXMubmdTZWxlY3QuaXRlbXNMaXN0Lm1hcFNlbGVjdGVkSXRlbXMoKTtcbiAgICAgIH1cbiAgICAgIHRoaXMubmdTZWxlY3QuZGV0ZWN0Q2hhbmdlcygpO1xuICAgIH07XG5cbiAgICBjb25zdCBoYW5kbGVPcHRpb25DaGFuZ2UgPSAoKSA9PiB7XG4gICAgICBjb25zdCBjaGFuZ2VkT3JEZXN0cm95ZWQgPSBtZXJnZSh0aGlzLm10eE9wdGlvbnMuY2hhbmdlcywgdGhpcy5fZGVzdHJveSQpO1xuICAgICAgbWVyZ2UoLi4udGhpcy5tdHhPcHRpb25zLm1hcChvcHRpb24gPT4gb3B0aW9uLnN0YXRlQ2hhbmdlJCkpXG4gICAgICAgIC5waXBlKHRha2VVbnRpbChjaGFuZ2VkT3JEZXN0cm95ZWQpKVxuICAgICAgICAuc3Vic2NyaWJlKG9wdGlvbiA9PiB7XG4gICAgICAgICAgY29uc3QgaXRlbSA9IHRoaXMubmdTZWxlY3QuaXRlbXNMaXN0LmZpbmRJdGVtKG9wdGlvbi52YWx1ZSk7XG4gICAgICAgICAgaXRlbS5kaXNhYmxlZCA9IG9wdGlvbi5kaXNhYmxlZDtcbiAgICAgICAgICBpdGVtLmxhYmVsID0gb3B0aW9uLmxhYmVsIHx8IGl0ZW0ubGFiZWw7XG4gICAgICAgICAgdGhpcy5uZ1NlbGVjdC5kZXRlY3RDaGFuZ2VzKCk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICB0aGlzLm10eE9wdGlvbnMuY2hhbmdlc1xuICAgICAgLnBpcGUoc3RhcnRXaXRoKHRoaXMubXR4T3B0aW9ucyksIHRha2VVbnRpbCh0aGlzLl9kZXN0cm95JCkpXG4gICAgICAuc3Vic2NyaWJlKG9wdGlvbnMgPT4ge1xuICAgICAgICBtYXBNdHhPcHRpb25zKG9wdGlvbnMpO1xuICAgICAgICBoYW5kbGVPcHRpb25DaGFuZ2UoKTtcbiAgICAgIH0pO1xuICB9XG5cbiAgb3BlbigpIHtcbiAgICB0aGlzLm5nU2VsZWN0Lm9wZW4oKTtcbiAgfVxuXG4gIGNsb3NlKCkge1xuICAgIHRoaXMubmdTZWxlY3QuY2xvc2UoKTtcbiAgfVxuXG4gIGZvY3VzKCkge1xuICAgIHRoaXMubmdTZWxlY3QuZm9jdXMoKTtcbiAgfVxuXG4gIGJsdXIoKSB7XG4gICAgdGhpcy5uZ1NlbGVjdC5ibHVyKCk7XG4gIH1cblxuICBzdGF0aWMgbmdBY2NlcHRJbnB1dFR5cGVfcmVxdWlyZWQ6IEJvb2xlYW5JbnB1dDtcbiAgc3RhdGljIG5nQWNjZXB0SW5wdXRUeXBlX2Rpc2FibGVkOiBCb29sZWFuSW5wdXQ7XG59XG4iXX0=