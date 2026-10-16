import{a as te}from"./chunk-WUTAN2M6.js";import{a as ee}from"./chunk-GVK3XAKR.js";import{a as S,e as X,g as Y,q as Z}from"./chunk-6574ZMJB.js";import{da as x,ea as _,pa as U,ra as W,ta as w,ua as J,za as K}from"./chunk-YU7GZCPI.js";import{$a as v,Ca as A,Da as O,G as b,H as E,I as B,Ia as a,J as F,Ja as c,Ka as g,L as m,Nb as p,Ra as H,U as D,Ua as h,Ub as I,Vb as $,Wa as z,Za as P,_ as r,_a as Q,ab as C,dc as j,fa as f,gc as q,hb as R,ib as u,ma as y,na as L,qa as V,ra as k,sa as N,vb as T,xb as G,za as s}from"./chunk-7OSJJIKA.js";var ie=`
    .p-toggleswitch {
        display: inline-block;
        width: dt('toggleswitch.width');
        height: dt('toggleswitch.height');
    }

    .p-toggleswitch-input {
        cursor: pointer;
        appearance: none;
        position: absolute;
        top: 0;
        inset-inline-start: 0;
        width: 100%;
        height: 100%;
        padding: 0;
        margin: 0;
        opacity: 0;
        z-index: 1;
        outline: 0 none;
        border-radius: dt('toggleswitch.border.radius');
    }

    .p-toggleswitch-slider {
        cursor: pointer;
        width: 100%;
        height: 100%;
        border-width: dt('toggleswitch.border.width');
        border-style: solid;
        border-color: dt('toggleswitch.border.color');
        background: dt('toggleswitch.background');
        transition:
            background dt('toggleswitch.transition.duration'),
            color dt('toggleswitch.transition.duration'),
            border-color dt('toggleswitch.transition.duration'),
            outline-color dt('toggleswitch.transition.duration'),
            box-shadow dt('toggleswitch.transition.duration');
        border-radius: dt('toggleswitch.border.radius');
        outline-color: transparent;
        box-shadow: dt('toggleswitch.shadow');
    }

    .p-toggleswitch-handle {
        position: absolute;
        top: 50%;
        display: flex;
        justify-content: center;
        align-items: center;
        background: dt('toggleswitch.handle.background');
        color: dt('toggleswitch.handle.color');
        width: dt('toggleswitch.handle.size');
        height: dt('toggleswitch.handle.size');
        inset-inline-start: dt('toggleswitch.gap');
        margin-block-start: calc(-1 * calc(dt('toggleswitch.handle.size') / 2));
        border-radius: dt('toggleswitch.handle.border.radius');
        transition:
            background dt('toggleswitch.transition.duration'),
            color dt('toggleswitch.transition.duration'),
            inset-inline-start dt('toggleswitch.slide.duration'),
            box-shadow dt('toggleswitch.slide.duration');
    }

    .p-toggleswitch.p-toggleswitch-checked .p-toggleswitch-slider {
        background: dt('toggleswitch.checked.background');
        border-color: dt('toggleswitch.checked.border.color');
    }

    .p-toggleswitch.p-toggleswitch-checked .p-toggleswitch-handle {
        background: dt('toggleswitch.handle.checked.background');
        color: dt('toggleswitch.handle.checked.color');
        inset-inline-start: calc(dt('toggleswitch.width') - calc(dt('toggleswitch.handle.size') + dt('toggleswitch.gap')));
    }

    .p-toggleswitch:not(.p-disabled):has(.p-toggleswitch-input:hover) .p-toggleswitch-slider {
        background: dt('toggleswitch.hover.background');
        border-color: dt('toggleswitch.hover.border.color');
    }

    .p-toggleswitch:not(.p-disabled):has(.p-toggleswitch-input:hover) .p-toggleswitch-handle {
        background: dt('toggleswitch.handle.hover.background');
        color: dt('toggleswitch.handle.hover.color');
    }

    .p-toggleswitch:not(.p-disabled):has(.p-toggleswitch-input:hover).p-toggleswitch-checked .p-toggleswitch-slider {
        background: dt('toggleswitch.checked.hover.background');
        border-color: dt('toggleswitch.checked.hover.border.color');
    }

    .p-toggleswitch:not(.p-disabled):has(.p-toggleswitch-input:hover).p-toggleswitch-checked .p-toggleswitch-handle {
        background: dt('toggleswitch.handle.checked.hover.background');
        color: dt('toggleswitch.handle.checked.hover.color');
    }

    .p-toggleswitch:not(.p-disabled):has(.p-toggleswitch-input:focus-visible) .p-toggleswitch-slider {
        box-shadow: dt('toggleswitch.focus.ring.shadow');
        outline: dt('toggleswitch.focus.ring.width') dt('toggleswitch.focus.ring.style') dt('toggleswitch.focus.ring.color');
        outline-offset: dt('toggleswitch.focus.ring.offset');
    }

    .p-toggleswitch.p-invalid > .p-toggleswitch-slider {
        border-color: dt('toggleswitch.invalid.border.color');
    }

    .p-toggleswitch.p-disabled {
        opacity: 1;
    }

    .p-toggleswitch.p-disabled .p-toggleswitch-slider {
        background: dt('toggleswitch.disabled.background');
    }

    .p-toggleswitch.p-disabled .p-toggleswitch-handle {
        background: dt('toggleswitch.handle.disabled.background');
    }
`;var re=["handle"],se=["input"],ce=t=>({checked:t});function ge(t,l){t&1&&H(0)}function he(t,l){if(t&1&&N(0,ge,1,0,"ng-container",3),t&2){let i=z();a("ngTemplateOutlet",i.handleTemplate||i._handleTemplate)("ngTemplateOutletContext",G(2,ce,i.checked()))}}var ue=`
    ${ie}

    p-toggleswitch.ng-invalid.ng-dirty > .p-toggleswitch-slider {
        border-color: dt('toggleswitch.invalid.border.color');
    }
`,pe={root:{position:"relative"}},we={root:({instance:t})=>["p-toggleswitch p-component",{"p-toggleswitch p-component":!0,"p-toggleswitch-checked":t.checked(),"p-disabled":t.$disabled(),"p-invalid":t.invalid()}],input:"p-toggleswitch-input",slider:"p-toggleswitch-slider",handle:"p-toggleswitch-handle"},ne=(()=>{class t extends U{name="toggleswitch";style=ue;classes=we;inlineStyles=pe;static \u0275fac=(()=>{let i;return function(e){return(i||(i=r(t)))(e||t)}})();static \u0275prov=E({token:t,factory:t.\u0275fac})}return t})();var oe=new F("TOGGLESWITCH_INSTANCE"),be={provide:S,useExisting:b(()=>M),multi:!0},M=(()=>{class t extends ee{componentName="ToggleSwitch";$pcToggleSwitch=m(oe,{optional:!0,skipSelf:!0})??void 0;bindDirectiveInstance=m(w,{self:!0});onAfterViewChecked(){this.bindDirectiveInstance.setAttrs(this.ptms(["host","root"]))}styleClass;tabindex;inputId;readonly;trueValue=!0;falseValue=!1;ariaLabel;size=p();ariaLabelledBy;autofocus;onChange=new D;input;handleTemplate;_handleTemplate;focused=!1;_componentStyle=m(ne);templates;onHostClick(i){this.onClick(i)}onAfterContentInit(){this.templates.forEach(i=>{i.getType()==="handle"?this._handleTemplate=i.template:this._handleTemplate=i.template})}onClick(i){!this.$disabled()&&!this.readonly&&(this.writeModelValue(this.checked()?this.falseValue:this.trueValue),this.onModelChange(this.modelValue()),this.onChange.emit({originalEvent:i,checked:this.modelValue()}),this.input.nativeElement.focus())}onFocus(){this.focused=!0}onBlur(){this.focused=!1,this.onModelTouched()}checked(){return this.modelValue()===this.trueValue}writeControlValue(i,n){n(i),this.cd.markForCheck()}get dataP(){return this.cn({checked:this.checked(),disabled:this.$disabled(),invalid:this.invalid()})}static \u0275fac=(()=>{let i;return function(e){return(i||(i=r(t)))(e||t)}})();static \u0275cmp=y({type:t,selectors:[["p-toggleswitch"],["p-toggleSwitch"],["p-toggle-switch"]],contentQueries:function(n,e,o){if(n&1&&P(o,re,4)(o,x,4),n&2){let d;v(d=C())&&(e.handleTemplate=d.first),v(d=C())&&(e.templates=d)}},viewQuery:function(n,e){if(n&1&&Q(se,5),n&2){let o;v(o=C())&&(e.input=o.first)}},hostVars:7,hostBindings:function(n,e){n&1&&h("click",function(d){return e.onHostClick(d)}),n&2&&(s("data-p-checked",e.checked())("data-p-disabled",e.$disabled())("data-p",e.dataP),R(e.sx("root")),u(e.cn(e.cx("root"),e.styleClass)))},inputs:{styleClass:"styleClass",tabindex:[2,"tabindex","tabindex",$],inputId:"inputId",readonly:[2,"readonly","readonly",I],trueValue:"trueValue",falseValue:"falseValue",ariaLabel:"ariaLabel",size:[1,"size"],ariaLabelledBy:"ariaLabelledBy",autofocus:[2,"autofocus","autofocus",I]},outputs:{onChange:"onChange"},features:[T([be,ne,{provide:oe,useExisting:t},{provide:W,useExisting:t}]),V([w]),k],decls:5,vars:22,consts:[["input",""],["type","checkbox","role","switch",3,"focus","blur","checked","pAutoFocus","pBind"],[3,"pBind"],[4,"ngTemplateOutlet","ngTemplateOutletContext"]],template:function(n,e){n&1&&(c(0,"input",1,0),h("focus",function(){return e.onFocus()})("blur",function(){return e.onBlur()}),g(),c(2,"div",2)(3,"div",2),A(4,he,1,4,"ng-container"),g()()),n&2&&(u(e.cx("input")),a("checked",e.checked())("pAutoFocus",e.autofocus)("pBind",e.ptm("input")),s("id",e.inputId)("required",e.required()?"":void 0)("disabled",e.$disabled()?"":void 0)("aria-checked",e.checked())("aria-labelledby",e.ariaLabelledBy)("aria-label",e.ariaLabel)("name",e.name())("tabindex",e.tabindex),f(2),u(e.cx("slider")),a("pBind",e.ptm("slider")),s("data-p",e.dataP),f(),u(e.cx("handle")),a("pBind",e.ptm("handle")),s("data-p",e.dataP),f(),O(e.handleTemplate||e._handleTemplate?4:-1))},dependencies:[q,j,K,_,J,w],encapsulation:2,changeDetection:0})}return t})(),le=(()=>{class t{static \u0275fac=function(n){return new(n||t)};static \u0275mod=L({type:t});static \u0275inj=B({imports:[M,_,_]})}return t})();var ae=class t extends te{inputId=p();ariaLabel=p();set(l){this.update(l),this.touch()}static \u0275fac=(()=>{let l;return function(n){return(l||(l=r(t)))(n||t)}})();static \u0275cmp=y({type:t,selectors:[["app-toggle"]],hostAttrs:[1,"inline-flex"],inputs:{inputId:[1,"inputId"],ariaLabel:[1,"ariaLabel"]},features:[T([{provide:S,useExisting:b(()=>t),multi:!0}]),k],decls:1,vars:4,consts:[[3,"ngModelChange","ngModel","disabled","inputId","ariaLabel"]],template:function(i,n){i&1&&(c(0,"p-toggleswitch",0),h("ngModelChange",function(o){return n.set(o)}),g()),i&2&&a("ngModel",n.value()??!1)("disabled",n.isDisabled())("inputId",n.inputId())("ariaLabel",n.ariaLabel())},dependencies:[Z,X,Y,le,M],encapsulation:2,changeDetection:0})};export{ae as a};
