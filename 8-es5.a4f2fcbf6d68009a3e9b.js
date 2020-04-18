function _classCallCheck(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}function _defineProperties(e,t){for(var o=0;o<t.length;o++){var l=t[o];l.enumerable=l.enumerable||!1,l.configurable=!0,"value"in l&&(l.writable=!0),Object.defineProperty(e,l.key,l)}}function _createClass(e,t,o){return t&&_defineProperties(e.prototype,t),o&&_defineProperties(e,o),e}(window.webpackJsonp=window.webpackJsonp||[]).push([[8],{pq4U:function(e,t,o){"use strict";o.r(t);var l=o("sEIs"),i=o("d2mR"),a=[{position:1,name:"Boron",tag:[{color:"red",value:[1,2]}],weight:10.811,symbol:"B",gender:"male",mobile:"13198765432",tele:"567891234",city:"Berlin",address:"Bernauer Str.111,13355",date:"1423456765768",website:"www.matero.com",company:"matero",email:"Boron@gmail.com",status:!1},{position:2,name:"Helium",tag:[{color:"blue",value:[3,4]}],weight:8.0026,symbol:"He",gender:"female",mobile:"13034676675",tele:"80675432",city:"Shanghai",address:"88 Songshan Road",date:"1423456765768",website:"www.matero.com",company:"matero",email:"Helium@gmail.com",status:!0},{position:3,name:"Nitrogen",tag:[{color:"yellow",value:[5,6]}],weight:14.0067,symbol:"N",gender:"male",mobile:"15811112222",tele:"345678912",city:"Sydney",address:"Circular Quay, Sydney NSW 2000",date:"1423456765768",website:"www.matero.com",company:"matero",email:"Nitrogen@gmail.com",status:!0}],n=o("EM62"),c=o("PBFl"),d=o("CGrA"),r=o("+Tre"),b=o("nIj0"),s=o("F1o0"),m=o("k8N0"),h=["statusTpl"];function u(e,t){1&e&&n.Kc(0),2&e&&n.Mc(" ",t.$implicit.name,"\n")}function g(e,t){1&e&&(n.Wb(0,"mat-slide-toggle",17),n.Kc(1,"Slide me!"),n.Vb()),2&e&&n.oc("checked",t.$implicit.status)}var p,f=function(){return[]},w=((p=function(){function e(){_classCallCheck(this,e),this.list=a,this.isLoading=!1,this.columns=[{header:"Name",field:"name"},{header:"Weight",field:"weight"},{header:"Gender",field:"gender"},{header:"Mobile",field:"mobile"},{header:"City",field:"city"}],this.columnsSortable=[{header:"Name",field:"name",sortable:!0},{header:"Weight",field:"weight",sortable:!0},{header:"Gender",field:"gender",sortable:!0},{header:"Mobile",field:"mobile",sortable:!0},{header:"City",field:"city",sortable:!0}],this.columnsExpandable=[{header:"Name",field:"name",showExpand:!0},{header:"Weight",field:"weight"},{header:"Gender",field:"gender"},{header:"Mobile",field:"mobile"},{header:"City",field:"city"}],this.columnsPinnable=[{header:"Position",field:"position",width:"200px"},{header:"Name",field:"name",width:"200px",pinned:"left"},{header:"tags",field:"tag.0.value",width:"200px"},{header:"Weight",field:"weight",width:"200px",pinned:"left"},{header:"Symbol",field:"symbol",width:"200px"},{header:"Gender",field:"gender",width:"200px"},{header:"Mobile",field:"mobile",width:"200px"},{header:"Tele",field:"tele",width:"200px"},{header:"City",field:"city",width:"200px"},{header:"Address",field:"address",width:"200px"},{header:"Date",field:"date",width:"200px"},{header:"Website",field:"website",width:"200px"},{header:"Company",field:"company",width:"200px"},{header:"Email",field:"email",width:"200px",pinned:"right"},{header:"Status",field:"status",type:"boolean",width:"200px"}],this.columnsWithButtons=[{header:"Name",field:"name"},{header:"Weight",field:"weight"},{header:"Gender",field:"gender"},{header:"Mobile",field:"mobile"},{header:"City",field:"city"},{header:"Option",field:"option",width:"120px",pinned:"right",right:"0px",type:"button",buttons:[{type:"icon",text:"edit",icon:"edit",tooltip:"Edit",click:function(){alert("edit")}},{type:"icon",text:"delete",icon:"delete",tooltip:"Delete",color:"warn",pop:!0,popTitle:"Confirm delete?",click:function(){alert("delete")}}]}],this.columnsWithFormatting=[{header:"Name",field:"name",formatter:function(e){return'<span class="label">'.concat(e.name,"</span>")}},{header:"Weight",field:"weight"},{header:"Gender",field:"gender"},{header:"Mobile",field:"mobile"},{header:"City",field:"city"}],this.columnsWithCustomCell=[],this.multiSelectable=!0,this.rowSelectable=!0,this.hideRowSelectionCheckbox=!1,this.columnHideable=!0,this.columnMovable=!0,this.rowHover=!0,this.rowStriped=!1}return _createClass(e,[{key:"ngOnInit",value:function(){this.columnsWithCustomCell=[{header:"Name",field:"name"},{header:"Weight",field:"weight"},{header:"Gender",field:"gender"},{header:"Mobile",field:"mobile"},{header:"City",field:"city"},{header:"Status",field:"status",cellTemplate:this.statusTpl}]}},{key:"log",value:function(e){console.log(e)}}]),e}()).\u0275fac=function(e){return new(e||p)},p.\u0275cmp=n.Kb({type:p,selectors:[["app-data-grid-demo"]],viewQuery:function(e,t){var o;1&e&&n.Fc(h,!0),2&e&&n.vc(o=n.fc())&&(t.statusTpl=o.first)},decls:107,vars:50,consts:[["mat-raised-button","","color","primary","href","https://github.com/ng-matero/extensions/blob/master/projects/demos/src/app/data-grid/data-grid-demo.component.html","target","_blank"],["mat-raised-button","","color","accent","href","https://nzbin.gitbook.io/material-extensions/data-grid","target","_blank"],[3,"data","columns"],[3,"data","columns","loading"],[3,"data","columns","pageOnFront","showPaginator"],[3,"data","columns","sortOnFront","sortChange"],[3,"ngModel","ngModelChange"],[1,"mx-3",3,"ngModel","ngModelChange"],[3,"value"],[1,"mx-3",3,"value"],[3,"data","columns","multiSelectable","hideRowSelectionCheckbox","rowSelectable","rowSelectionChange","cellSelectionChange"],[3,"data","columns","expandable","expansionTemplate"],["expansionTpl",""],[1,"mb-3"],[3,"data","columns","showToolbar","columnHideable","columnMovable"],[3,"data","columns","rowHover","rowStriped"],["statusTpl",""],[3,"checked"]],template:function(e,t){if(1&e&&(n.Wb(0,"p"),n.Kc(1," The "),n.Wb(2,"code"),n.Kc(3,"mtx-grid"),n.Vb(),n.Kc(4," is an powerful material table component. It supports cell selectable, row selectable, multiple row selectable, row expandable, column hiding, column moving and so on. "),n.Wb(5,"a",0),n.Kc(6," View Code "),n.Vb(),n.Wb(7,"a",1),n.Kc(8,"API"),n.Vb(),n.Vb(),n.Wb(9,"h3"),n.Kc(10,"Basic"),n.Vb(),n.Rb(11,"mtx-grid",2),n.Wb(12,"h3"),n.Kc(13,"Loading Status"),n.Vb(),n.Rb(14,"mtx-grid",3),n.Wb(15,"h3"),n.Kc(16,"Hide Pagination"),n.Vb(),n.Wb(17,"p"),n.Kc(18,"If you hide the pagination, you should set "),n.Wb(19,"code"),n.Kc(20,"pageOnFront"),n.Vb(),n.Kc(21," false to show all the data.\n"),n.Vb(),n.Rb(22,"mtx-grid",4),n.Wb(23,"h3"),n.Kc(24,"Sortable"),n.Vb(),n.Wb(25,"mtx-grid",5),n.ec("sortChange",(function(e){return t.log(e)})),n.Vb(),n.Wb(26,"h3"),n.Kc(27,"Row Selectable"),n.Vb(),n.Wb(28,"mat-checkbox",6),n.ec("ngModelChange",(function(e){return t.rowSelectable=e})),n.Kc(29,"Row selectable"),n.Vb(),n.Wb(30,"mat-checkbox",7),n.ec("ngModelChange",(function(e){return t.hideRowSelectionCheckbox=e})),n.Kc(31,"Hide checkbox"),n.Vb(),n.Wb(32,"mat-radio-group",6),n.ec("ngModelChange",(function(e){return t.multiSelectable=e})),n.Wb(33,"mat-radio-button",8),n.Kc(34,"Single"),n.Vb(),n.Wb(35,"mat-radio-button",9),n.Kc(36,"Multiple"),n.Vb(),n.Vb(),n.Wb(37,"p"),n.Kc(38,"If you choose multiple option, you can press "),n.Wb(39,"kbd"),n.Kc(40,"ctrl"),n.Vb(),n.Kc(41,"/"),n.Wb(42,"kbd"),n.Kc(43,"command"),n.Vb(),n.Kc(44," + click or select checkboxs to choose multiple row."),n.Vb(),n.Wb(45,"mtx-grid",10),n.ec("rowSelectionChange",(function(e){return t.log(e)}))("cellSelectionChange",(function(e){return t.log(e)})),n.Vb(),n.Wb(46,"h3"),n.Kc(47,"Expandable Row"),n.Vb(),n.Rb(48,"mtx-grid",11),n.Ic(49,u,1,1,"ng-template",null,12,n.Jc),n.Wb(51,"h3"),n.Kc(52,"Column Hiding & Moving"),n.Vb(),n.Wb(53,"div",13),n.Wb(54,"mat-checkbox",6),n.ec("ngModelChange",(function(e){return t.columnHideable=e})),n.Kc(55,"Column Hiding"),n.Vb(),n.Wb(56,"mat-checkbox",7),n.ec("ngModelChange",(function(e){return t.columnMovable=e})),n.Kc(57,"Column Moving"),n.Vb(),n.Vb(),n.Wb(58,"p"),n.Kc(59,"Click the "),n.Wb(60,"kbd"),n.Kc(61,"Column Shown"),n.Vb(),n.Kc(62," button, you can select or drag the columns."),n.Vb(),n.Rb(63,"mtx-grid",14),n.Wb(64,"h3"),n.Kc(65,"Column Pinnable"),n.Vb(),n.Wb(66,"p"),n.Kc(67,"The "),n.Wb(68,"code"),n.Kc(69,"name"),n.Vb(),n.Kc(70," and "),n.Wb(71,"code"),n.Kc(72,"weight"),n.Vb(),n.Kc(73," column pinned left, the "),n.Wb(74,"code"),n.Kc(75,"email"),n.Vb(),n.Kc(76," column pinned right. Scroll the columns to test."),n.Vb(),n.Rb(77,"mtx-grid",2),n.Wb(78,"h3"),n.Kc(79,"Hover & Striped effect"),n.Vb(),n.Wb(80,"div",13),n.Wb(81,"mat-checkbox",6),n.ec("ngModelChange",(function(e){return t.rowHover=e})),n.Kc(82,"Hover"),n.Vb(),n.Wb(83,"mat-checkbox",7),n.ec("ngModelChange",(function(e){return t.rowStriped=e})),n.Kc(84,"Striped"),n.Vb(),n.Vb(),n.Rb(85,"mtx-grid",15),n.Wb(86,"h3"),n.Kc(87,"Row with option buttons"),n.Vb(),n.Rb(88,"mtx-grid",2),n.Wb(89,"h3"),n.Kc(90,"Custom cell template"),n.Vb(),n.Wb(91,"p"),n.Kc(92,"The status column is a custom cell."),n.Vb(),n.Rb(93,"mtx-grid",2),n.Ic(94,g,2,1,"ng-template",null,16,n.Jc),n.Wb(96,"h3"),n.Kc(97,"Data Formatting"),n.Vb(),n.Wb(98,"p"),n.Kc(99,"The "),n.Wb(100,"code"),n.Kc(101,"name"),n.Vb(),n.Kc(102," field use a formatter."),n.Vb(),n.Rb(103,"mtx-grid",2),n.Wb(104,"h3"),n.Kc(105,"No Result"),n.Vb(),n.Rb(106,"mtx-grid",2)),2&e){var o=n.wc(50);n.Cb(11),n.oc("data",t.list)("columns",t.columns),n.Cb(3),n.oc("data",t.list)("columns",t.columns)("loading",!0),n.Cb(8),n.oc("data",t.list)("columns",t.columns)("pageOnFront",!1)("showPaginator",!1),n.Cb(3),n.oc("data",t.list)("columns",t.columnsSortable)("sortOnFront",!0),n.Cb(3),n.oc("ngModel",t.rowSelectable),n.Cb(2),n.oc("ngModel",t.hideRowSelectionCheckbox),n.Cb(2),n.oc("ngModel",t.multiSelectable),n.Cb(1),n.oc("value",!1),n.Cb(2),n.oc("value",!0),n.Cb(10),n.oc("data",t.list)("columns",t.columns)("multiSelectable",t.multiSelectable)("hideRowSelectionCheckbox",t.hideRowSelectionCheckbox)("rowSelectable",t.rowSelectable),n.Cb(3),n.oc("data",t.list)("columns",t.columnsExpandable)("expandable",!0)("expansionTemplate",o),n.Cb(6),n.oc("ngModel",t.columnHideable),n.Cb(2),n.oc("ngModel",t.columnMovable),n.Cb(7),n.oc("data",t.list)("columns",t.columns)("showToolbar",!0)("columnHideable",t.columnHideable)("columnMovable",t.columnMovable),n.Cb(14),n.oc("data",t.list)("columns",t.columnsPinnable),n.Cb(4),n.oc("ngModel",t.rowHover),n.Cb(2),n.oc("ngModel",t.rowStriped),n.Cb(2),n.oc("data",t.list)("columns",t.columns)("rowHover",t.rowHover)("rowStriped",t.rowStriped),n.Cb(3),n.oc("data",t.list)("columns",t.columnsWithButtons),n.Cb(5),n.oc("data",t.list)("columns",t.columnsWithCustomCell),n.Cb(10),n.oc("data",t.list)("columns",t.columnsWithFormatting),n.Cb(3),n.oc("data",n.qc(49,f))("columns",t.columnsWithFormatting)}},directives:[c.a,d.a,r.a,b.m,b.p,s.b,s.a,m.a],styles:["[_nghost-%COMP%]     .label{padding:5px 10px;border-radius:999px;background-color:#ffb74d}"]}),p);o.d(t,"DataGridDemoModule",(function(){return x}));var C,x=((C=function e(){_classCallCheck(this,e)}).\u0275mod=n.Ob({type:C}),C.\u0275inj=n.Nb({factory:function(e){return new(e||C)},imports:[[i.a,l.h.forChild([{path:"",component:w}])]]}),C)}}]);