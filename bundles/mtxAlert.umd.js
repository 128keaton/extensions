(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@angular/core'), require('@angular/common')) :
    typeof define === 'function' && define.amd ? define('@ng-matero/extensions/alert', ['exports', '@angular/core', '@angular/common'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory((global['ng-matero'] = global['ng-matero'] || {}, global['ng-matero'].extensions = global['ng-matero'].extensions || {}, global['ng-matero'].extensions.alert = {}), global.ng.core, global.ng.common));
}(this, (function (exports, core, common) { 'use strict';

    var MtxAlertComponent = /** @class */ (function () {
        function MtxAlertComponent(_changeDetectorRef) {
            this._changeDetectorRef = _changeDetectorRef;
            /** The alert type */
            this.type = 'default';
            /** Whether alert visible */
            this.isOpen = true;
            /** Material elevation */
            this.elevation = 0;
            /** This event fires when alert closed, $event is an instance of Alert component */
            this.closed = new core.EventEmitter();
        }
        Object.defineProperty(MtxAlertComponent.prototype, "hostClassList", {
            get: function () {
                return "mtx-alert-" + this.type;
            },
            enumerable: false,
            configurable: true
        });
        MtxAlertComponent.prototype._onClosed = function () {
            this.isOpen = false;
            this._changeDetectorRef.markForCheck();
            this.closed.emit(this);
        };
        return MtxAlertComponent;
    }());
    MtxAlertComponent.decorators = [
        { type: core.Component, args: [{
                    selector: 'mtx-alert',
                    exportAs: 'mtxAlert',
                    host: {
                        class: 'mtx-alert',
                    },
                    template: "<ng-template [ngIf]=\"isOpen\">\n  <div [ngClass]=\"['mtx-alert-ref',\n                   'mtx-alert-ref-' + type,\n                   'mat-elevation-z' + elevation,\n                    dismissible ? 'mtx-alert-dismissible' : '']\"\n       role=\"alert\">\n    <ng-content></ng-content>\n    <ng-template [ngIf]=\"dismissible\">\n      <button type=\"button\" class=\"mtx-alert-close\" aria-label=\"Close\" (click)=\"_onClosed()\">\n        <span aria-hidden=\"true\">&times;</span>\n      </button>\n    </ng-template>\n  </div>\n</ng-template>\n",
                    encapsulation: core.ViewEncapsulation.None,
                    changeDetection: core.ChangeDetectionStrategy.OnPush,
                    styles: [".mtx-alert-ref{position:relative;padding:.75rem 1.25rem;margin-bottom:1rem;border:1px solid transparent;border-radius:.25rem}.mtx-alert-close{position:absolute;top:0;bottom:0;right:0;padding:0 1.25rem;font-size:1.5rem;line-height:1;color:inherit;opacity:.5;background-color:transparent;border:0;cursor:pointer}[dir=rtl] .mtx-alert-close{right:auto;left:0}.mtx-alert-close:hover{opacity:.75}.mtx-alert-dismissible{padding-right:4rem}"]
                },] }
    ];
    /** @nocollapse */
    MtxAlertComponent.ctorParameters = function () { return [
        { type: core.ChangeDetectorRef }
    ]; };
    MtxAlertComponent.propDecorators = {
        hostClassList: [{ type: core.HostBinding, args: ['class',] }],
        type: [{ type: core.Input }],
        isOpen: [{ type: core.Input }],
        dismissible: [{ type: core.Input }],
        color: [{ type: core.Input }],
        elevation: [{ type: core.Input }],
        closed: [{ type: core.Output }]
    };

    var MtxAlertModule = /** @class */ (function () {
        function MtxAlertModule() {
        }
        return MtxAlertModule;
    }());
    MtxAlertModule.decorators = [
        { type: core.NgModule, args: [{
                    imports: [common.CommonModule],
                    exports: [MtxAlertComponent],
                    declarations: [MtxAlertComponent],
                },] }
    ];

    /**
     * Generated bundle index. Do not edit.
     */

    exports.MtxAlertComponent = MtxAlertComponent;
    exports.MtxAlertModule = MtxAlertModule;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=mtxAlert.umd.js.map
