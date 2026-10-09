import{ca as m,ma as R,oa as A,pa as W,qa as a}from"./chunk-752MXUHN.js";import{f as j}from"./chunk-42S4W4AC.js";import{Bb as N,Ga as i,K as k,L as v,Lb as w,N as S,Ob as d,Oc as L,P as p,Pb as B,Qb as E,Ua as c,Va as b,X as C,Xb as P,Ya as D,Za as M,eb as f,ec as F,fc as T,ha as g,hb as x,ib as I,nb as u,ob as s,pb as o,qb as l}from"./chunk-IDR4EVBB.js";var V=`
    .p-progressspinner {
        position: relative;
        margin: 0 auto;
        width: 100px;
        height: 100px;
        display: inline-block;
    }

    .p-progressspinner::before {
        content: '';
        display: block;
        padding-top: 100%;
    }

    .p-progressspinner-spin {
        height: 100%;
        transform-origin: center center;
        width: 100%;
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
        margin: auto;
        animation: p-progressspinner-rotate 2s linear infinite;
    }

    .p-progressspinner-circle {
        stroke-dasharray: 89, 200;
        stroke-dashoffset: 0;
        stroke: dt('progressspinner.colorOne');
        animation:
            p-progressspinner-dash 1.5s ease-in-out infinite,
            p-progressspinner-color 6s ease-in-out infinite;
        stroke-linecap: round;
    }

    @keyframes p-progressspinner-rotate {
        100% {
            transform: rotate(360deg);
        }
    }
    @keyframes p-progressspinner-dash {
        0% {
            stroke-dasharray: 1, 200;
            stroke-dashoffset: 0;
        }
        50% {
            stroke-dasharray: 89, 200;
            stroke-dashoffset: -35px;
        }
        100% {
            stroke-dasharray: 89, 200;
            stroke-dashoffset: -124px;
        }
    }
    @keyframes p-progressspinner-color {
        100%,
        0% {
            stroke: dt('progressspinner.color.one');
        }
        40% {
            stroke: dt('progressspinner.color.two');
        }
        66% {
            stroke: dt('progressspinner.color.three');
        }
        80%,
        90% {
            stroke: dt('progressspinner.color.four');
        }
    }
`;var q={root:()=>["p-progressspinner"],spin:"p-progressspinner-spin",circle:"p-progressspinner-circle"},_=(()=>{class e extends R{name="progressspinner";style=V;classes=q;static \u0275fac=(()=>{let t;return function(n){return(t||(t=g(e)))(n||e)}})();static \u0275prov=k({token:e,factory:e.\u0275fac})}return e})();var G=new S("PROGRESSSPINNER_INSTANCE"),y=(()=>{class e extends W{componentName="ProgressSpinner";$pcProgressSpinner=p(G,{optional:!0,skipSelf:!0})??void 0;bindDirectiveInstance=p(a,{self:!0});styleClass;strokeWidth="2";fill="none";animationDuration="2s";ariaLabel;onAfterViewChecked(){this.bindDirectiveInstance.setAttrs(this.ptms(["host","root"]))}_componentStyle=p(_);static \u0275fac=(()=>{let t;return function(n){return(t||(t=g(e)))(n||e)}})();static \u0275cmp=c({type:e,selectors:[["p-progressSpinner"],["p-progress-spinner"],["p-progressspinner"]],hostVars:5,hostBindings:function(r,n){r&2&&(f("aria-label",n.ariaLabel)("role","progressbar")("aria-busy",!0),d(n.cn(n.cx("root"),n.styleClass)))},inputs:{styleClass:"styleClass",strokeWidth:"strokeWidth",fill:"fill",animationDuration:"animationDuration",ariaLabel:"ariaLabel"},features:[P([_,{provide:G,useExisting:e},{provide:A,useExisting:e}]),D([a]),M],decls:2,vars:10,consts:[["viewBox","25 25 50 50",3,"pBind"],["cx","50","cy","50","r","20","stroke-miterlimit","10",3,"pBind"]],template:function(r,n){r&1&&(C(),s(0,"svg",0),l(1,"circle",1),o()),r&2&&(d(n.cx("spin")),w("animation-duration",n.animationDuration),u("pBind",n.ptm("spin")),i(),d(n.cx("circle")),u("pBind",n.ptm("circle")),f("fill",n.fill)("stroke-width",n.strokeWidth))},dependencies:[L,m,a],encapsulation:2,changeDetection:0})}return e})(),O=(()=>{class e{static \u0275fac=function(r){return new(r||e)};static \u0275mod=b({type:e});static \u0275inj=v({imports:[y,m,m]})}return e})();function J(e,h){if(e&1&&(s(0,"p",2),B(1),F(2,"translate"),o()),e&2){let t=N();i(),E(T(2,1,t.message))}}var H=class e{message="common.loading";showMessage=!0;static \u0275fac=function(t){return new(t||e)};static \u0275cmp=c({type:e,selectors:[["app-loading-state"]],inputs:{message:"message",showMessage:"showMessage"},decls:3,vars:1,consts:[[1,"flex","flex-col","items-center","justify-center","gap-3","py-16"],["styleClass","!h-10 !w-10","strokeWidth","4"],[1,"text-sm","text-gray-500","dark:text-gray-400"]],template:function(t,r){t&1&&(s(0,"div",0),l(1,"p-progressSpinner",1),x(2,J,3,3,"p",2),o()),t&2&&(i(2),I(r.showMessage?2:-1))},dependencies:[O,y,j],encapsulation:2,changeDetection:0})};export{H as a};
