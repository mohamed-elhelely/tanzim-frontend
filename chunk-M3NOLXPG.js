import{ba as $,ca as f,ma as J,oa as K,pa as L,qa as d}from"./chunk-752MXUHN.js";import{Bb as s,Cb as A,Db as j,Eb as z,Ga as r,Gb as _,Gc as V,Hb as b,Ic as q,K as I,Kc as G,L as x,N as k,Ob as p,Oc as H,P as g,Pb as P,Qb as Q,Ua as u,Va as B,Xb as O,Ya as D,Za as M,_a as c,eb as S,ha as y,hb as w,ib as N,nb as a,ob as v,pb as T,qb as m,ub as E,uc as R,vb as F}from"./chunk-IDR4EVBB.js";var U=`
    .p-tag {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: dt('tag.primary.background');
        color: dt('tag.primary.color');
        font-size: dt('tag.font.size');
        font-weight: dt('tag.font.weight');
        padding: dt('tag.padding');
        border-radius: dt('tag.border.radius');
        gap: dt('tag.gap');
    }

    .p-tag-icon {
        font-size: dt('tag.icon.size');
        width: dt('tag.icon.size');
        height: dt('tag.icon.size');
    }

    .p-tag-rounded {
        border-radius: dt('tag.rounded.border.radius');
    }

    .p-tag-success {
        background: dt('tag.success.background');
        color: dt('tag.success.color');
    }

    .p-tag-info {
        background: dt('tag.info.background');
        color: dt('tag.info.color');
    }

    .p-tag-warn {
        background: dt('tag.warn.background');
        color: dt('tag.warn.color');
    }

    .p-tag-danger {
        background: dt('tag.danger.background');
        color: dt('tag.danger.color');
    }

    .p-tag-secondary {
        background: dt('tag.secondary.background');
        color: dt('tag.secondary.color');
    }

    .p-tag-contrast {
        background: dt('tag.contrast.background');
        color: dt('tag.contrast.color');
    }
`;var te=["icon"],ne=["*"];function oe(e,i){if(e&1&&m(0,"span",4),e&2){let t=s(2);p(t.cx("icon")),a("ngClass",t.icon)("pBind",t.ptm("icon"))}}function ae(e,i){if(e&1&&(E(0),c(1,oe,1,4,"span",3),F()),e&2){let t=s();r(),a("ngIf",t.icon)}}function ie(e,i){}function re(e,i){e&1&&c(0,ie,0,0,"ng-template")}function se(e,i){if(e&1&&(v(0,"span",2),c(1,re,1,0,null,5),T()),e&2){let t=s();p(t.cx("icon")),a("pBind",t.ptm("icon")),r(),a("ngTemplateOutlet",t.iconTemplate||t._iconTemplate)}}var ce={root:({instance:e})=>["p-tag p-component",{"p-tag-info":e.severity==="info","p-tag-success":e.severity==="success","p-tag-warn":e.severity==="warn","p-tag-danger":e.severity==="danger","p-tag-secondary":e.severity==="secondary","p-tag-contrast":e.severity==="contrast","p-tag-rounded":e.rounded}],icon:"p-tag-icon",label:"p-tag-label"},W=(()=>{class e extends J{name="tag";style=U;classes=ce;static \u0275fac=(()=>{let t;return function(n){return(t||(t=y(e)))(n||e)}})();static \u0275prov=I({token:e,factory:e.\u0275fac})}return e})();var X=new k("TAG_INSTANCE"),C=(()=>{class e extends L{componentName="Tag";$pcTag=g(X,{optional:!0,skipSelf:!0})??void 0;bindDirectiveInstance=g(d,{self:!0});onAfterViewChecked(){this.bindDirectiveInstance.setAttrs(this.ptms(["host","root"]))}styleClass;severity;value;icon;rounded;iconTemplate;templates;_iconTemplate;_componentStyle=g(W);onAfterContentInit(){this.templates?.forEach(t=>{t.getType()==="icon"&&(this._iconTemplate=t.template)})}get dataP(){return this.cn({rounded:this.rounded,[this.severity]:this.severity})}static \u0275fac=(()=>{let t;return function(n){return(t||(t=y(e)))(n||e)}})();static \u0275cmp=u({type:e,selectors:[["p-tag"]],contentQueries:function(o,n,h){if(o&1&&z(h,te,4)(h,$,4),o&2){let l;_(l=b())&&(n.iconTemplate=l.first),_(l=b())&&(n.templates=l)}},hostVars:3,hostBindings:function(o,n){o&2&&(S("data-p",n.dataP),p(n.cn(n.cx("root"),n.styleClass)))},inputs:{styleClass:"styleClass",severity:"severity",value:"value",icon:"icon",rounded:[2,"rounded","rounded",R]},features:[O([W,{provide:X,useExisting:e},{provide:K,useExisting:e}]),D([d]),M],ngContentSelectors:ne,decls:5,vars:6,consts:[[4,"ngIf"],[3,"class","pBind",4,"ngIf"],[3,"pBind"],[3,"class","ngClass","pBind",4,"ngIf"],[3,"ngClass","pBind"],[4,"ngTemplateOutlet"]],template:function(o,n){o&1&&(A(),j(0),c(1,ae,2,1,"ng-container",0)(2,se,2,4,"span",1),v(3,"span",2),P(4),T()),o&2&&(r(),a("ngIf",!n.iconTemplate&&!n._iconTemplate),r(),a("ngIf",n.iconTemplate||n._iconTemplate),r(),p(n.cx("label")),a("pBind",n.ptm("label")),r(),Q(n.value))},dependencies:[H,V,q,G,f,d],encapsulation:2,changeDetection:0})}return e})(),Y=(()=>{class e{static \u0275fac=function(o){return new(o||e)};static \u0275mod=B({type:e});static \u0275inj=x({imports:[C,f,f]})}return e})();function de(e,i){if(e&1&&m(0,"p-tag",0),e&2){let t=s();a("value",t.value)("severity",t.severity)("icon",t.icon)}}var Z=class e{value="";severity="info";icon;static \u0275fac=function(t){return new(t||e)};static \u0275cmp=u({type:e,selectors:[["app-status-badge"]],inputs:{value:"value",severity:"severity",icon:"icon"},decls:1,vars:1,consts:[[3,"value","severity","icon"]],template:function(t,o){t&1&&w(0,de,1,3,"p-tag",0),t&2&&N(o.value?0:-1)},dependencies:[Y,C],encapsulation:2,changeDetection:0})};export{Z as a};
