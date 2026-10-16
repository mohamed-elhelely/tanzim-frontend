import{ba as z,ca as G,da as J,ea as C,f as $,pa as K,ra as L,sa as U,ta as g,ua as M}from"./chunk-YU7GZCPI.js";import{$a as s,H as F,I as k,Ia as i,J as N,Ja as c,Ka as d,L as T,Pa as D,Qa as E,Ra as y,Wa as _,X as j,Xa as v,Ya as h,Za as A,_ as x,ab as m,bc as P,dc as H,fa as r,gc as V,hb as q,ib as u,jb as S,kb as B,ma as b,na as Q,qa as R,ra as w,sa as p,vb as O}from"./chunk-7OSJJIKA.js";var W=`
    .p-card {
        background: dt('card.background');
        color: dt('card.color');
        box-shadow: dt('card.shadow');
        border-radius: dt('card.border.radius');
        display: flex;
        flex-direction: column;
    }

    .p-card-caption {
        display: flex;
        flex-direction: column;
        gap: dt('card.caption.gap');
    }

    .p-card-body {
        padding: dt('card.body.padding');
        display: flex;
        flex-direction: column;
        gap: dt('card.body.gap');
    }

    .p-card-title {
        font-size: dt('card.title.font.size');
        font-weight: dt('card.title.font.weight');
    }

    .p-card-subtitle {
        color: dt('card.subtitle.color');
    }
`;var ne=["header"],ie=["title"],ae=["subtitle"],oe=["content"],re=["footer"],le=["*",[["p-header"]],[["p-footer"]]],pe=["*","p-header","p-footer"];function ce(t,l){t&1&&y(0)}function de(t,l){if(t&1&&(c(0,"div",1),h(1,1),p(2,ce,1,0,"ng-container",2),d()),t&2){let e=_();u(e.cx("header")),i("pBind",e.ptm("header")),r(2),i("ngTemplateOutlet",e.headerTemplate||e._headerTemplate)}}function se(t,l){if(t&1&&(D(0),S(1),E()),t&2){let e=_(2);r(),B(e.header)}}function me(t,l){t&1&&y(0)}function fe(t,l){if(t&1&&(c(0,"div",1),p(1,se,2,1,"ng-container",3)(2,me,1,0,"ng-container",2),d()),t&2){let e=_();u(e.cx("title")),i("pBind",e.ptm("title")),r(),i("ngIf",e.header&&!e._titleTemplate&&!e.titleTemplate),r(),i("ngTemplateOutlet",e.titleTemplate||e._titleTemplate)}}function ue(t,l){if(t&1&&(D(0),S(1),E()),t&2){let e=_(2);r(),B(e.subheader)}}function _e(t,l){t&1&&y(0)}function ye(t,l){if(t&1&&(c(0,"div",1),p(1,ue,2,1,"ng-container",3)(2,_e,1,0,"ng-container",2),d()),t&2){let e=_();u(e.cx("subtitle")),i("pBind",e.ptm("subtitle")),r(),i("ngIf",e.subheader&&!e._subtitleTemplate&&!e.subtitleTemplate),r(),i("ngTemplateOutlet",e.subtitleTemplate||e._subtitleTemplate)}}function he(t,l){t&1&&y(0)}function ge(t,l){t&1&&y(0)}function Te(t,l){if(t&1&&(c(0,"div",1),h(1,2),p(2,ge,1,0,"ng-container",2),d()),t&2){let e=_();u(e.cx("footer")),i("pBind",e.ptm("footer")),r(2),i("ngTemplateOutlet",e.footerTemplate||e._footerTemplate)}}var be=`
    ${W}

    .p-card {
        display: block;
    }
`,ve={root:"p-card p-component",header:"p-card-header",body:"p-card-body",caption:"p-card-caption",title:"p-card-title",subtitle:"p-card-subtitle",content:"p-card-content",footer:"p-card-footer"},X=(()=>{class t extends K{name="card";style=be;classes=ve;static \u0275fac=(()=>{let e;return function(n){return(e||(e=x(t)))(n||t)}})();static \u0275prov=F({token:t,factory:t.\u0275fac})}return t})();var Y=new N("CARD_INSTANCE"),I=(()=>{class t extends U{componentName="Card";$pcCard=T(Y,{optional:!0,skipSelf:!0})??void 0;bindDirectiveInstance=T(g,{self:!0});_componentStyle=T(X);onAfterViewChecked(){this.bindDirectiveInstance.setAttrs(this.ptms(["host","root"]))}header;subheader;set style(e){$(this._style(),e)||(this._style.set(e),this.el?.nativeElement&&e&&Object.keys(e).forEach(o=>{this.el.nativeElement.style[o]=e[o]}))}get style(){return this._style()}styleClass;headerFacet;footerFacet;headerTemplate;titleTemplate;subtitleTemplate;contentTemplate;footerTemplate;_headerTemplate;_titleTemplate;_subtitleTemplate;_contentTemplate;_footerTemplate;_style=j(null);getBlockableElement(){return this.el.nativeElement}templates;onAfterContentInit(){this.templates.forEach(e=>{switch(e.getType()){case"header":this._headerTemplate=e.template;break;case"title":this._titleTemplate=e.template;break;case"subtitle":this._subtitleTemplate=e.template;break;case"content":this._contentTemplate=e.template;break;case"footer":this._footerTemplate=e.template;break;default:this._contentTemplate=e.template;break}})}static \u0275fac=(()=>{let e;return function(n){return(e||(e=x(t)))(n||t)}})();static \u0275cmp=b({type:t,selectors:[["p-card"]],contentQueries:function(o,n,f){if(o&1&&A(f,z,5)(f,G,5)(f,ne,4)(f,ie,4)(f,ae,4)(f,oe,4)(f,re,4)(f,J,4),o&2){let a;s(a=m())&&(n.headerFacet=a.first),s(a=m())&&(n.footerFacet=a.first),s(a=m())&&(n.headerTemplate=a.first),s(a=m())&&(n.titleTemplate=a.first),s(a=m())&&(n.subtitleTemplate=a.first),s(a=m())&&(n.contentTemplate=a.first),s(a=m())&&(n.footerTemplate=a.first),s(a=m())&&(n.templates=a)}},hostVars:4,hostBindings:function(o,n){o&2&&(q(n._style()),u(n.cn(n.cx("root"),n.styleClass)))},inputs:{header:"header",subheader:"subheader",style:"style",styleClass:"styleClass"},features:[O([X,{provide:Y,useExisting:t},{provide:L,useExisting:t}]),R([g]),w],ngContentSelectors:pe,decls:8,vars:11,consts:[[3,"pBind","class",4,"ngIf"],[3,"pBind"],[4,"ngTemplateOutlet"],[4,"ngIf"]],template:function(o,n){o&1&&(v(le),p(0,de,3,4,"div",0),c(1,"div",1),p(2,fe,3,5,"div",0)(3,ye,3,5,"div",0),c(4,"div",1),h(5),p(6,he,1,0,"ng-container",2),d(),p(7,Te,3,4,"div",0),d()),o&2&&(i("ngIf",n.headerFacet||n.headerTemplate||n._headerTemplate),r(),u(n.cx("body")),i("pBind",n.ptm("body")),r(),i("ngIf",n.header||n.titleTemplate||n._titleTemplate),r(),i("ngIf",n.subheader||n.subtitleTemplate||n._subtitleTemplate),r(),u(n.cx("content")),i("pBind",n.ptm("content")),r(2),i("ngTemplateOutlet",n.contentTemplate||n._contentTemplate),r(),i("ngIf",n.footerFacet||n.footerTemplate||n._footerTemplate))},dependencies:[V,P,H,C,M,g],encapsulation:2,changeDetection:0})}return t})(),Z=(()=>{class t{static \u0275fac=function(o){return new(o||t)};static \u0275mod=Q({type:t});static \u0275inj=k({imports:[I,C,M,C,M]})}return t})();var Me=["*"],ee=class t{static \u0275fac=function(e){return new(e||t)};static \u0275cmp=b({type:t,selectors:[["app-card"]],hostAttrs:[1,"block"],ngContentSelectors:Me,decls:2,vars:0,template:function(e,o){e&1&&(v(),c(0,"p-card"),h(1),d())},dependencies:[Z,I],encapsulation:2,changeDetection:0})};export{ee as a};
