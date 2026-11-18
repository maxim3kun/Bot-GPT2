import{r as Wn,j as Ei}from"./index-vCmLXx-U.js";const Ui="187",Bd=0,Jl=1,kd=2,jr=1,Vd=2,Yr=3,gi=0,Yt=1,jt=2,hr=0,es=1,Ql=2,jl=3,ec=4,Hd=5,ar=100,zd=101,Gd=102,Wd=103,Xd=104,qd=200,Yd=201,Kd=202,$d=203,fh=204,ph=205,Zd=206,Jd=207,Qd=208,jd=209,ef=210,tf=211,nf=212,rf=213,sf=214,Ea=0,ba=1,Aa=2,rs=3,wa=4,Ra=5,Ca=6,Pa=7,mh=0,of=1,af=2,jn=0,gh=1,_h=2,vh=3,Ml=4,xh=5,Mh=6,Sh=7,tc="attached",lf="detached",yh=300,gr=301,ss=302,Po=303,Lo=304,_i=1e3,Dn=1001,ao=1002,It=1003,Th=1004,Kr=1005,Bt=1006,Qs=1007,vn=1008,en=1009,Eh=1010,bh=1011,os=1012,Sl=1013,Fn=1014,ln=1015,Bn=1016,yl=1017,Tl=1018,_r=1020,Ah=35902,wh=35899,Rh=1021,Ch=1022,xn=1023,vi=1026,mi=1027,El=1028,bl=1029,Oi=1030,Al=1031,wl=1033,js=33776,eo=33777,to=33778,no=33779,La=35840,Ia=35841,Na=35842,Da=35843,Ua=36196,Oa=37492,Fa=37496,Ba=37488,ka=37489,lo=37490,Va=37491,Ha=37808,za=37809,Ga=37810,Wa=37811,Xa=37812,qa=37813,Ya=37814,Ka=37815,$a=37816,Za=37817,Ja=37818,Qa=37819,ja=37820,el=37821,tl=36492,nl=36494,il=36495,rl=36283,sl=36284,co=36285,ol=36286,as=2300,ls=2301,Io=2302,nc=2303,ic=2400,rc=2401,sc=2402,cf=2500,uf=0,Ph=1,al=2,hf=3200,uo=0,df=1,pi="",Pt="srgb",tn="srgb-linear",ho="linear",gt="srgb",No=7680,ff=519,pf=512,mf=513,gf=514,Lh=515,_f=516,vf=517,Ih=518,Nh=519,Dh=35044,xf=35048,oc="300 es",Mn=2e3,cs=2001;function Mf(i){for(let e=i.length-1;e>=0;--e)if(i[e]>=65535)return!0;return!1}function Sf(i){return ArrayBuffer.isView(i)&&!(i instanceof DataView)}function us(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function yf(){const i=us("canvas");return i.style.display="block",i}const ac={};function fo(...i){const e="THREE."+i.shift();console.log(e,...i)}function Uh(i){const e=i[0];if(typeof e=="string"&&e.startsWith("TSL:")){const t=i[1];t&&t.isStackTrace?i[0]+=" "+t.getLocation():i[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return i}function De(...i){i=Uh(i);const e="THREE."+i.shift();{const t=i[0];t&&t.isStackTrace?console.warn(t.getError(e)):console.warn(e,...i)}}function Xe(...i){i=Uh(i);const e="THREE."+i.shift();{const t=i[0];t&&t.isStackTrace?console.error(t.getError(e)):console.error(e,...i)}}function dr(...i){const e=i.join(" ");e in ac||(ac[e]=!0,De(...i))}function Tf(i,e,t){return new Promise(function(n,r){function s(){switch(i.clientWaitSync(e,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:r();break;case i.TIMEOUT_EXPIRED:setTimeout(s,t);break;default:n()}}setTimeout(s,t)})}const Ef={[Ea]:Ea,[Aa]:Ca,[wa]:wa,[rs]:Ra,[ba]:ba,[Ca]:Aa,[Pa]:Pa,[Ra]:rs};class Fi{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){const n=this._listeners;return n===void 0?!1:n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){const n=this._listeners;if(n===void 0)return;const r=n[e];if(r!==void 0){const s=r.indexOf(t);s!==-1&&r.splice(s,1)}}dispatchEvent(e){const t=this._listeners;if(t===void 0)return;const n=t[e.type];if(n!==void 0){e.target=this;const r=n.slice(0);for(let s=0,o=r.length;s<o;s++)r[s].call(this,e);e.target=null}}}const zt=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];let lc=1234567;const ts=Math.PI/180,vr=180/Math.PI;function kn(){const i=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(zt[i&255]+zt[i>>8&255]+zt[i>>16&255]+zt[i>>24&255]+"-"+zt[e&255]+zt[e>>8&255]+"-"+zt[e>>16&15|64]+zt[e>>24&255]+"-"+zt[t&63|128]+zt[t>>8&255]+"-"+zt[t>>16&255]+zt[t>>24&255]+zt[n&255]+zt[n>>8&255]+zt[n>>16&255]+zt[n>>24&255]).toLowerCase()}function nt(i,e,t){return Math.max(e,Math.min(t,i))}function Rl(i,e){return(i%e+e)%e}function bf(i,e,t,n,r){return n+(i-e)*(r-n)/(t-e)}function Af(i,e,t){return i!==e?(t-i)/(e-i):0}function ns(i,e,t){return(1-t)*i+t*e}function wf(i,e,t,n){return ns(i,e,1-Math.exp(-t*n))}function Rf(i,e=1){return e-Math.abs(Rl(i,e*2)-e)}function Cf(i,e,t){return i<=e?0:i>=t?1:(i=(i-e)/(t-e),i*i*(3-2*i))}function Pf(i,e,t){return i<=e?0:i>=t?1:(i=(i-e)/(t-e),i*i*i*(i*(i*6-15)+10))}function Lf(i,e){return i+Math.floor(Math.random()*(e-i+1))}function If(i,e){return i+Math.random()*(e-i)}function Nf(i){return i*(.5-Math.random())}function Df(i){i!==void 0&&(lc=i);let e=lc+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}function Uf(i){return i*ts}function Of(i){return i*vr}function Ff(i){return i>0&&Number.isInteger(i)&&2**Math.round(Math.log2(i))===i}function Bf(i){return Math.pow(2,Math.ceil(Math.log(i)/Math.LN2))}function Oh(i){return Math.pow(2,Math.floor(Math.log(i)/Math.LN2))}function kf(i,e,t,n,r){const s=Math.cos,o=Math.sin,a=s(t/2),l=o(t/2),c=s((e+n)/2),u=o((e+n)/2),h=s((e-n)/2),d=o((e-n)/2),f=s((n-e)/2),g=o((n-e)/2);switch(r){case"XYX":i.set(a*u,l*h,l*d,a*c);break;case"YZY":i.set(l*d,a*u,l*h,a*c);break;case"ZXZ":i.set(l*h,l*d,a*u,a*c);break;case"XZX":i.set(a*u,l*g,l*f,a*c);break;case"YXY":i.set(l*f,a*u,l*g,a*c);break;case"ZYZ":i.set(l*g,l*f,a*u,a*c);break;default:De("MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+r)}}function Eo(i){switch(i.constructor){case Uint32Array:return 4294967295;case Uint16Array:return 65535;case Uint8Array:case Uint8ClampedArray:return 255;case Int32Array:return 2147483647;case Int16Array:return 32767;case Int8Array:return 127;default:return}}function Cl(i,e){if(e.constructor===Float32Array)return i;const t=Eo(e);if(t===void 0)throw new Error("THREE.MathUtils: Invalid component type.");return Math.max(i/t,-1)}function Pl(i,e){if(e.constructor===Float32Array)return i;const t=Eo(e);if(t===void 0)throw new Error("THREE.MathUtils: Invalid component type.");return Math.round(i*t)}const ut={DEG2RAD:ts,RAD2DEG:vr,generateUUID:kn,clamp:nt,euclideanModulo:Rl,mapLinear:bf,inverseLerp:Af,lerp:ns,damp:wf,pingpong:Rf,smoothstep:Cf,smootherstep:Pf,randInt:Lf,randFloat:If,randFloatSpread:Nf,seededRandom:Df,degToRad:Uf,radToDeg:Of,isPowerOfTwo:Ff,ceilPowerOfTwo:Bf,floorPowerOfTwo:Oh,setQuaternionFromProperEuler:kf,normalize:Pl,denormalize:Cl},ql=class ql{constructor(e=0,t=0){this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("THREE.Vector2: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("THREE.Vector2: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,n=this.y,r=e.elements;return this.x=r[0]*t+r[3]*n+r[6],this.y=r[1]*t+r[4]*n+r[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=nt(this.x,e.x,t.x),this.y=nt(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=nt(this.x,e,t),this.y=nt(this.y,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(nt(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(nt(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const n=Math.cos(t),r=Math.sin(t),s=this.x-e.x,o=this.y-e.y;return this.x=s*n-o*r+e.x,this.y=s*r+o*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}};ql.prototype.isVector2=!0;let Ye=ql;class Fe{constructor(e=0,t=0,n=0,r=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=r}static slerpFlat(e,t,n,r,s,o,a){let l=n[r+0],c=n[r+1],u=n[r+2],h=n[r+3],d=s[o+0],f=s[o+1],g=s[o+2],v=s[o+3];if(h!==v||l!==d||c!==f||u!==g){let p=l*d+c*f+u*g+h*v;p<0&&(d=-d,f=-f,g=-g,v=-v,p=-p);let m=1-a;if(p<.9995){const x=Math.acos(p),A=Math.sin(x);m=Math.sin(m*x)/A,a=Math.sin(a*x)/A,l=l*m+d*a,c=c*m+f*a,u=u*m+g*a,h=h*m+v*a}else{l=l*m+d*a,c=c*m+f*a,u=u*m+g*a,h=h*m+v*a;const x=1/Math.sqrt(l*l+c*c+u*u+h*h);l*=x,c*=x,u*=x,h*=x}}e[t]=l,e[t+1]=c,e[t+2]=u,e[t+3]=h}static multiplyQuaternionsFlat(e,t,n,r,s,o){const a=n[r],l=n[r+1],c=n[r+2],u=n[r+3],h=s[o],d=s[o+1],f=s[o+2],g=s[o+3];return e[t]=a*g+u*h+l*f-c*d,e[t+1]=l*g+u*d+c*h-a*f,e[t+2]=c*g+u*f+a*d-l*h,e[t+3]=u*g-a*h-l*d-c*f,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,r){return this._x=e,this._y=t,this._z=n,this._w=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const n=e._x,r=e._y,s=e._z,o=e._order,a=Math.cos,l=Math.sin,c=a(n/2),u=a(r/2),h=a(s/2),d=l(n/2),f=l(r/2),g=l(s/2);switch(o){case"XYZ":this._x=d*u*h+c*f*g,this._y=c*f*h-d*u*g,this._z=c*u*g+d*f*h,this._w=c*u*h-d*f*g;break;case"YXZ":this._x=d*u*h+c*f*g,this._y=c*f*h-d*u*g,this._z=c*u*g-d*f*h,this._w=c*u*h+d*f*g;break;case"ZXY":this._x=d*u*h-c*f*g,this._y=c*f*h+d*u*g,this._z=c*u*g+d*f*h,this._w=c*u*h-d*f*g;break;case"ZYX":this._x=d*u*h-c*f*g,this._y=c*f*h+d*u*g,this._z=c*u*g-d*f*h,this._w=c*u*h+d*f*g;break;case"YZX":this._x=d*u*h+c*f*g,this._y=c*f*h+d*u*g,this._z=c*u*g-d*f*h,this._w=c*u*h-d*f*g;break;case"XZY":this._x=d*u*h-c*f*g,this._y=c*f*h-d*u*g,this._z=c*u*g+d*f*h,this._w=c*u*h+d*f*g;break;default:De("Quaternion: .setFromEuler() encountered an unknown order: "+o)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const n=t/2,r=Math.sin(n);return this._x=e.x*r,this._y=e.y*r,this._z=e.z*r,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,n=t[0],r=t[4],s=t[8],o=t[1],a=t[5],l=t[9],c=t[2],u=t[6],h=t[10],d=n+a+h;if(d>0){const f=.5/Math.sqrt(d+1);this._w=.25/f,this._x=(u-l)*f,this._y=(s-c)*f,this._z=(o-r)*f}else if(n>a&&n>h){const f=2*Math.sqrt(1+n-a-h);this._w=(u-l)/f,this._x=.25*f,this._y=(r+o)/f,this._z=(s+c)/f}else if(a>h){const f=2*Math.sqrt(1+a-n-h);this._w=(s-c)/f,this._x=(r+o)/f,this._y=.25*f,this._z=(l+u)/f}else{const f=2*Math.sqrt(1+h-n-a);this._w=(o-r)/f,this._x=(s+c)/f,this._y=(l+u)/f,this._z=.25*f}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<1e-8?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(nt(this.dot(e),-1,1)))}rotateTowards(e,t){const n=this.angleTo(e);if(n===0)return this;const r=Math.min(1,t/n);return this.slerp(e,r),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const n=e._x,r=e._y,s=e._z,o=e._w,a=t._x,l=t._y,c=t._z,u=t._w;return this._x=n*u+o*a+r*c-s*l,this._y=r*u+o*l+s*a-n*c,this._z=s*u+o*c+n*l-r*a,this._w=o*u-n*a-r*l-s*c,this._onChangeCallback(),this}slerp(e,t){let n=e._x,r=e._y,s=e._z,o=e._w,a=this.dot(e);a<0&&(n=-n,r=-r,s=-s,o=-o,a=-a);let l=1-t;if(a<.9995){const c=Math.acos(a),u=Math.sin(c);l=Math.sin(l*c)/u,t=Math.sin(t*c)/u,this._x=this._x*l+n*t,this._y=this._y*l+r*t,this._z=this._z*l+s*t,this._w=this._w*l+o*t,this._onChangeCallback()}else this._x=this._x*l+n*t,this._y=this._y*l+r*t,this._z=this._z*l+s*t,this._w=this._w*l+o*t,this.normalize();return this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){const e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),r=Math.sqrt(1-n),s=Math.sqrt(n);return this.set(r*Math.sin(e),r*Math.cos(e),s*Math.sin(t),s*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}const Yl=class Yl{constructor(e=0,t=0,n=0){this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("THREE.Vector3: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("THREE.Vector3: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(cc.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(cc.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,n=this.y,r=this.z,s=e.elements;return this.x=s[0]*t+s[3]*n+s[6]*r,this.y=s[1]*t+s[4]*n+s[7]*r,this.z=s[2]*t+s[5]*n+s[8]*r,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,n=this.y,r=this.z,s=e.elements,o=1/(s[3]*t+s[7]*n+s[11]*r+s[15]);return this.x=(s[0]*t+s[4]*n+s[8]*r+s[12])*o,this.y=(s[1]*t+s[5]*n+s[9]*r+s[13])*o,this.z=(s[2]*t+s[6]*n+s[10]*r+s[14])*o,this}applyQuaternion(e){const t=this.x,n=this.y,r=this.z,s=e.x,o=e.y,a=e.z,l=e.w,c=2*(o*r-a*n),u=2*(a*t-s*r),h=2*(s*n-o*t);return this.x=t+l*c+o*h-a*u,this.y=n+l*u+a*c-s*h,this.z=r+l*h+s*u-o*c,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,n=this.y,r=this.z,s=e.elements;return this.x=s[0]*t+s[4]*n+s[8]*r,this.y=s[1]*t+s[5]*n+s[9]*r,this.z=s[2]*t+s[6]*n+s[10]*r,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=nt(this.x,e.x,t.x),this.y=nt(this.y,e.y,t.y),this.z=nt(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=nt(this.x,e,t),this.y=nt(this.y,e,t),this.z=nt(this.z,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(nt(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const n=e.x,r=e.y,s=e.z,o=t.x,a=t.y,l=t.z;return this.x=r*l-s*a,this.y=s*o-n*l,this.z=n*a-r*o,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return Do.copy(this).projectOnVector(e),this.sub(Do)}reflect(e){return this.sub(Do.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const n=this.dot(e)/t;return Math.acos(nt(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,n=this.y-e.y,r=this.z-e.z;return t*t+n*n+r*r}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){const r=Math.sin(t)*e;return this.x=r*Math.sin(n),this.y=Math.cos(t)*e,this.z=r*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),r=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=r,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}};Yl.prototype.isVector3=!0;let C=Yl;const Do=new C,cc=new Fe,Kl=class Kl{constructor(e,t,n,r,s,o,a,l,c){this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,r,s,o,a,l,c)}set(e,t,n,r,s,o,a,l,c){const u=this.elements;return u[0]=e,u[1]=r,u[2]=a,u[3]=t,u[4]=s,u[5]=l,u[6]=n,u[7]=o,u[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,r=t.elements,s=this.elements,o=n[0],a=n[3],l=n[6],c=n[1],u=n[4],h=n[7],d=n[2],f=n[5],g=n[8],v=r[0],p=r[3],m=r[6],x=r[1],A=r[4],y=r[7],b=r[2],E=r[5],_=r[8];return s[0]=o*v+a*x+l*b,s[3]=o*p+a*A+l*E,s[6]=o*m+a*y+l*_,s[1]=c*v+u*x+h*b,s[4]=c*p+u*A+h*E,s[7]=c*m+u*y+h*_,s[2]=d*v+f*x+g*b,s[5]=d*p+f*A+g*E,s[8]=d*m+f*y+g*_,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[1],r=e[2],s=e[3],o=e[4],a=e[5],l=e[6],c=e[7],u=e[8];return t*o*u-t*a*c-n*s*u+n*a*l+r*s*c-r*o*l}invert(){const e=this.elements,t=e[0],n=e[1],r=e[2],s=e[3],o=e[4],a=e[5],l=e[6],c=e[7],u=e[8],h=u*o-a*c,d=a*l-u*s,f=c*s-o*l,g=t*h+n*d+r*f;if(g===0)return this.set(0,0,0,0,0,0,0,0,0);const v=1/g;return e[0]=h*v,e[1]=(r*c-u*n)*v,e[2]=(a*n-r*o)*v,e[3]=d*v,e[4]=(u*t-r*l)*v,e[5]=(r*s-a*t)*v,e[6]=f*v,e[7]=(n*l-c*t)*v,e[8]=(o*t-n*s)*v,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,r,s,o,a){const l=Math.cos(s),c=Math.sin(s);return this.set(n*l,n*c,-n*(l*o+c*a)+o+e,-r*c,r*l,-r*(-c*o+l*a)+a+t,0,0,1),this}scale(e,t){return dr("Matrix3: .scale() is deprecated. Use .makeScale() instead."),this.premultiply(Uo.makeScale(e,t)),this}rotate(e){return dr("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."),this.premultiply(Uo.makeRotation(-e)),this}translate(e,t){return dr("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."),this.premultiply(Uo.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,n=e.elements;for(let r=0;r<9;r++)if(t[r]!==n[r])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}};Kl.prototype.isMatrix3=!0;let Oe=Kl;const Uo=new Oe,uc=new Oe().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),hc=new Oe().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function Vf(){const i={enabled:!0,workingColorSpace:tn,spaces:{},convert:function(r,s,o){return this.enabled===!1||s===o||!s||!o||(this.spaces[s].transfer===gt&&(r.r=ei(r.r),r.g=ei(r.g),r.b=ei(r.b)),this.spaces[s].primaries!==this.spaces[o].primaries&&(r.applyMatrix3(this.spaces[s].toXYZ),r.applyMatrix3(this.spaces[o].fromXYZ)),this.spaces[o].transfer===gt&&(r.r=fr(r.r),r.g=fr(r.g),r.b=fr(r.b))),r},workingToColorSpace:function(r,s){return this.convert(r,this.workingColorSpace,s)},colorSpaceToWorking:function(r,s){return this.convert(r,s,this.workingColorSpace)},getPrimaries:function(r){return this.spaces[r].primaries},getTransfer:function(r){return r===pi?ho:this.spaces[r].transfer},getToneMappingMode:function(r){return this.spaces[r].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(r,s=this.workingColorSpace){return r.fromArray(this.spaces[s].luminanceCoefficients)},define:function(r){Object.assign(this.spaces,r)},_getMatrix:function(r,s,o){return r.copy(this.spaces[o].fromXYZ).multiply(this.spaces[s].toXYZ)},_getDrawingBufferColorSpace:function(r){return this.spaces[r].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(r=this.workingColorSpace){return this.spaces[r].workingColorSpaceConfig.unpackColorSpace}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],n=[.3127,.329];return i.define({[tn]:{primaries:e,whitePoint:n,transfer:ho,toXYZ:uc,fromXYZ:hc,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:Pt},outputColorSpaceConfig:{drawingBufferColorSpace:Pt}},[Pt]:{primaries:e,whitePoint:n,transfer:gt,toXYZ:uc,fromXYZ:hc,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:Pt}}}),i}const tt=Vf();function ei(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function fr(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}let Gi;class Hf{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let n;if(e instanceof HTMLCanvasElement)n=e;else{Gi===void 0&&(Gi=us("canvas")),Gi.width=e.width,Gi.height=e.height;const r=Gi.getContext("2d");e instanceof ImageData?r.putImageData(e,0,0):r.drawImage(e,0,0,e.width,e.height),n=Gi}return n.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=us("canvas");t.width=e.width,t.height=e.height;const n=t.getContext("2d");n.drawImage(e,0,0,e.width,e.height);const r=n.getImageData(0,0,e.width,e.height),s=r.data;for(let o=0;o<s.length;o++)s[o]=ei(s[o]/255)*255;return n.putImageData(r,0,0),t}else if(e.data){const t=e.data.slice(0);for(let n=0;n<t.length;n++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[n]=Math.floor(ei(t[n]/255)*255):t[n]=ei(t[n]);return{data:t,width:e.width,height:e.height}}else return De("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let zf=0;class Ll{constructor(e=null){this.isTextureSource=!0,Object.defineProperty(this,"id",{value:zf++}),this.uuid=kn(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){const t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):typeof VideoFrame<"u"&&t instanceof VideoFrame?e.set(t.displayWidth,t.displayHeight,0):t!==null?e.set(t.width||0,t.height||0,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const n={uuid:this.uuid,url:""},r=this.data;if(r!==null){let s;if(Array.isArray(r)){s=[];for(let o=0,a=r.length;o<a;o++)r[o].isDataTexture?s.push(Oo(r[o].image)):s.push(Oo(r[o]))}else s=Oo(r);n.url=s}return t||(e.images[this.uuid]=n),n}}function Oo(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?Hf.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(De("Texture: Unable to serialize Texture."),{})}let Gf=0;const Fo=new C;class Lt extends Fi{constructor(e=Lt.DEFAULT_IMAGE,t=Lt.DEFAULT_MAPPING,n=Dn,r=Dn,s=Bt,o=vn,a=xn,l=en,c=Lt.DEFAULT_ANISOTROPY,u=pi){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Gf++}),this.uuid=kn(),this.name="",this.source=new Ll(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=n,this.wrapT=r,this.magFilter=s,this.minFilter=o,this.anisotropy=c,this.format=a,this.internalFormat=null,this.type=l,this.offset=new Ye(0,0),this.repeat=new Ye(1,1),this.center=new Ye(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Oe,this.generateMipmaps=!0,this.mipmapsAutoUpdate=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=u,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0,this.isPMREMTexture=!1,this.normalized=!1}get width(){return this.source.getSize(Fo).x}get height(){return this.source.getSize(Fo).y}get depth(){return this.source.getSize(Fo).z}get image(){return this.source.data}set image(e){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.normalized=e.normalized,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.mipmapsAutoUpdate=e.mipmapsAutoUpdate,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isPMREMTexture=e.isPMREMTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(const t in e){const n=e[t];if(n===void 0){De(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}const r=this[t];if(r===void 0){De(`Texture.setValues(): property '${t}' does not exist.`);continue}r&&n&&r.isVector2&&n.isVector2||r&&n&&r.isVector3&&n.isVector3||r&&n&&r.isMatrix3&&n.isMatrix3?r.copy(n):this[t]=n}}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,mipmapsAutoUpdate:this.mipmapsAutoUpdate,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==yh)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case _i:e.x=e.x-Math.floor(e.x);break;case Dn:e.x=e.x<0?0:1;break;case ao:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case _i:e.y=e.y-Math.floor(e.y);break;case Dn:e.y=e.y<0?0:1;break;case ao:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}}Lt.DEFAULT_IMAGE=null;Lt.DEFAULT_MAPPING=yh;Lt.DEFAULT_ANISOTROPY=1;const $l=class $l{constructor(e=0,t=0,n=0,r=1){this.x=e,this.y=t,this.z=n,this.w=r}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,r){return this.x=e,this.y=t,this.z=n,this.w=r,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("THREE.Vector4: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("THREE.Vector4: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,n=this.y,r=this.z,s=this.w,o=e.elements;return this.x=o[0]*t+o[4]*n+o[8]*r+o[12]*s,this.y=o[1]*t+o[5]*n+o[9]*r+o[13]*s,this.z=o[2]*t+o[6]*n+o[10]*r+o[14]*s,this.w=o[3]*t+o[7]*n+o[11]*r+o[15]*s,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,r,s;const l=e.elements,c=l[0],u=l[4],h=l[8],d=l[1],f=l[5],g=l[9],v=l[2],p=l[6],m=l[10];if(Math.abs(u-d)<.01&&Math.abs(h-v)<.01&&Math.abs(g-p)<.01){if(Math.abs(u+d)<.1&&Math.abs(h+v)<.1&&Math.abs(g+p)<.1&&Math.abs(c+f+m-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const A=(c+1)/2,y=(f+1)/2,b=(m+1)/2,E=(u+d)/4,_=(h+v)/4,S=(g+p)/4;return A>y&&A>b?A<.01?(n=0,r=.707106781,s=.707106781):(n=Math.sqrt(A),r=E/n,s=_/n):y>b?y<.01?(n=.707106781,r=0,s=.707106781):(r=Math.sqrt(y),n=E/r,s=S/r):b<.01?(n=.707106781,r=.707106781,s=0):(s=Math.sqrt(b),n=_/s,r=S/s),this.set(n,r,s,t),this}let x=Math.sqrt((p-g)*(p-g)+(h-v)*(h-v)+(d-u)*(d-u));return Math.abs(x)<.001&&(x=1),this.x=(p-g)/x,this.y=(h-v)/x,this.z=(d-u)/x,this.w=Math.acos((c+f+m-1)/2),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=nt(this.x,e.x,t.x),this.y=nt(this.y,e.y,t.y),this.z=nt(this.z,e.z,t.z),this.w=nt(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=nt(this.x,e,t),this.y=nt(this.y,e,t),this.z=nt(this.z,e,t),this.w=nt(this.w,e,t),this}clampLength(e,t){const n=this.length();return this.divideScalar(n||1).multiplyScalar(nt(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}};$l.prototype.isVector4=!0;let xt=$l;class Wf extends Fi{constructor(e=1,t=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Bt,depthBuffer:!0,stencilBuffer:!1,resolveColorBuffer:!0,resolveDepthBuffer:!0,resolveStencilBuffer:!0,storeMultisampledColorBuffer:!0,storeMultisampledDepthBuffer:!0,storeMultisampledStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},n),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=n.depth,this.scissor=new xt(0,0,e,t),this.scissorTest=!1,this.viewport=new xt(0,0,e,t),this.textures=[];const r=n.count;for(let s=0;s<r;s++)this.textures[s]=new Lt({width:e,height:t,depth:n.depth}),this.textures[s].isRenderTargetTexture=!0,this.textures[s].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveColorBuffer=n.resolveColorBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this.storeMultisampledColorBuffer=n.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=n.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=n.storeMultisampledStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview,this.useArrayDepthTexture=n.useArrayDepthTexture}_setTextureOptions(e={}){const t={minFilter:Bt,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.mipmapsAutoUpdate!==void 0&&(t.mipmapsAutoUpdate=e.mipmapsAutoUpdate),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&this._depthTexture.renderTarget===this&&(this._depthTexture.renderTarget=null),e!==null&&e.renderTarget===null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let r=0,s=this.textures.length;r<s;r++)this.textures[r].image.width=e,this.textures[r].image.height=t,this.textures[r].image.depth=n,this.textures[r].isData3DTexture!==!0&&(this.textures[r].isArrayTexture=this.textures[r].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,n=e.textures.length;t<n;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;const r=Object.assign({},e.textures[t].image);this.textures[t].source=new Ll(r)}if(this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveColorBuffer=e.resolveColorBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,this.storeMultisampledColorBuffer=e.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=e.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=e.storeMultisampledStencilBuffer,e.depthTexture!==null)if(e.depthTexture.renderTarget===e){const t=e.depthTexture.clone();t.renderTarget=null,this.depthTexture=t}else this.depthTexture=e.depthTexture;else this.depthTexture=null;return this.samples=e.samples,this.multiview=e.multiview,this.useArrayDepthTexture=e.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}}class On extends Wf{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}}class Fh extends Lt{constructor(e=null,t=1,n=1,r=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:n,depth:r},this.magFilter=It,this.minFilter=It,this.wrapR=Dn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}copy(e){return super.copy(e),this.wrapR=e.wrapR,this}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}}class Xf extends Lt{constructor(e=null,t=1,n=1,r=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:n,depth:r},this.magFilter=It,this.minFilter=It,this.wrapR=Dn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}copy(e){return super.copy(e),this.wrapR=e.wrapR,this}}const To=class To{constructor(e,t,n,r,s,o,a,l,c,u,h,d,f,g,v,p){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,r,s,o,a,l,c,u,h,d,f,g,v,p)}set(e,t,n,r,s,o,a,l,c,u,h,d,f,g,v,p){const m=this.elements;return m[0]=e,m[4]=t,m[8]=n,m[12]=r,m[1]=s,m[5]=o,m[9]=a,m[13]=l,m[2]=c,m[6]=u,m[10]=h,m[14]=d,m[3]=f,m[7]=g,m[11]=v,m[15]=p,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new To().fromArray(this.elements)}copy(e){const t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){const t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return this.determinantAffine()===0?(e.set(1,0,0),t.set(0,1,0),n.set(0,0,1),this):(e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this)}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){if(e.determinantAffine()===0)return this.identity();const t=this.elements,n=e.elements,r=1/Wi.setFromMatrixColumn(e,0).length(),s=1/Wi.setFromMatrixColumn(e,1).length(),o=1/Wi.setFromMatrixColumn(e,2).length();return t[0]=n[0]*r,t[1]=n[1]*r,t[2]=n[2]*r,t[3]=0,t[4]=n[4]*s,t[5]=n[5]*s,t[6]=n[6]*s,t[7]=0,t[8]=n[8]*o,t[9]=n[9]*o,t[10]=n[10]*o,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,n=e.x,r=e.y,s=e.z,o=Math.cos(n),a=Math.sin(n),l=Math.cos(r),c=Math.sin(r),u=Math.cos(s),h=Math.sin(s);if(e.order==="XYZ"){const d=o*u,f=o*h,g=a*u,v=a*h;t[0]=l*u,t[4]=-l*h,t[8]=c,t[1]=f+g*c,t[5]=d-v*c,t[9]=-a*l,t[2]=v-d*c,t[6]=g+f*c,t[10]=o*l}else if(e.order==="YXZ"){const d=l*u,f=l*h,g=c*u,v=c*h;t[0]=d+v*a,t[4]=g*a-f,t[8]=o*c,t[1]=o*h,t[5]=o*u,t[9]=-a,t[2]=f*a-g,t[6]=v+d*a,t[10]=o*l}else if(e.order==="ZXY"){const d=l*u,f=l*h,g=c*u,v=c*h;t[0]=d-v*a,t[4]=-o*h,t[8]=g+f*a,t[1]=f+g*a,t[5]=o*u,t[9]=v-d*a,t[2]=-o*c,t[6]=a,t[10]=o*l}else if(e.order==="ZYX"){const d=o*u,f=o*h,g=a*u,v=a*h;t[0]=l*u,t[4]=g*c-f,t[8]=d*c+v,t[1]=l*h,t[5]=v*c+d,t[9]=f*c-g,t[2]=-c,t[6]=a*l,t[10]=o*l}else if(e.order==="YZX"){const d=o*l,f=o*c,g=a*l,v=a*c;t[0]=l*u,t[4]=v-d*h,t[8]=g*h+f,t[1]=h,t[5]=o*u,t[9]=-a*u,t[2]=-c*u,t[6]=f*h+g,t[10]=d-v*h}else if(e.order==="XZY"){const d=o*l,f=o*c,g=a*l,v=a*c;t[0]=l*u,t[4]=-h,t[8]=c*u,t[1]=d*h+v,t[5]=o*u,t[9]=f*h-g,t[2]=g*h-f,t[6]=a*u,t[10]=v*h+d}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(qf,e,Yf)}lookAt(e,t,n){const r=this.elements;return Jt.subVectors(e,t),Jt.lengthSq()===0&&(Jt.z=1),Jt.normalize(),si.crossVectors(n,Jt),si.lengthSq()===0&&(Math.abs(n.z)===1?Jt.x+=1e-4:Jt.z+=1e-4,Jt.normalize(),si.crossVectors(n,Jt)),si.normalize(),Ss.crossVectors(Jt,si),r[0]=si.x,r[4]=Ss.x,r[8]=Jt.x,r[1]=si.y,r[5]=Ss.y,r[9]=Jt.y,r[2]=si.z,r[6]=Ss.z,r[10]=Jt.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const n=e.elements,r=t.elements,s=this.elements,o=n[0],a=n[4],l=n[8],c=n[12],u=n[1],h=n[5],d=n[9],f=n[13],g=n[2],v=n[6],p=n[10],m=n[14],x=n[3],A=n[7],y=n[11],b=n[15],E=r[0],_=r[4],S=r[8],D=r[12],R=r[1],N=r[5],O=r[9],W=r[13],L=r[2],G=r[6],z=r[10],B=r[14],ee=r[3],Y=r[7],Z=r[11],te=r[15];return s[0]=o*E+a*R+l*L+c*ee,s[4]=o*_+a*N+l*G+c*Y,s[8]=o*S+a*O+l*z+c*Z,s[12]=o*D+a*W+l*B+c*te,s[1]=u*E+h*R+d*L+f*ee,s[5]=u*_+h*N+d*G+f*Y,s[9]=u*S+h*O+d*z+f*Z,s[13]=u*D+h*W+d*B+f*te,s[2]=g*E+v*R+p*L+m*ee,s[6]=g*_+v*N+p*G+m*Y,s[10]=g*S+v*O+p*z+m*Z,s[14]=g*D+v*W+p*B+m*te,s[3]=x*E+A*R+y*L+b*ee,s[7]=x*_+A*N+y*G+b*Y,s[11]=x*S+A*O+y*z+b*Z,s[15]=x*D+A*W+y*B+b*te,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],n=e[4],r=e[8],s=e[12],o=e[1],a=e[5],l=e[9],c=e[13],u=e[2],h=e[6],d=e[10],f=e[14],g=e[3],v=e[7],p=e[11],m=e[15],x=l*f-c*d,A=a*f-c*h,y=a*d-l*h,b=o*f-c*u,E=o*d-l*u,_=o*h-a*u;return t*(v*x-p*A+m*y)-n*(g*x-p*b+m*E)+r*(g*A-v*b+m*_)-s*(g*y-v*E+p*_)}determinantAffine(){const e=this.elements,t=e[0],n=e[4],r=e[8],s=e[1],o=e[5],a=e[9],l=e[2],c=e[6],u=e[10];return t*(o*u-a*c)-n*(s*u-a*l)+r*(s*c-o*l)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){const r=this.elements;return e.isVector3?(r[12]=e.x,r[13]=e.y,r[14]=e.z):(r[12]=e,r[13]=t,r[14]=n),this}invert(){const e=this.elements,t=e[0],n=e[1],r=e[2],s=e[3],o=e[4],a=e[5],l=e[6],c=e[7],u=e[8],h=e[9],d=e[10],f=e[11],g=e[12],v=e[13],p=e[14],m=e[15],x=t*a-n*o,A=t*l-r*o,y=t*c-s*o,b=n*l-r*a,E=n*c-s*a,_=r*c-s*l,S=u*v-h*g,D=u*p-d*g,R=u*m-f*g,N=h*p-d*v,O=h*m-f*v,W=d*m-f*p,L=x*W-A*O+y*N+b*R-E*D+_*S;if(L===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const G=1/L;return e[0]=(a*W-l*O+c*N)*G,e[1]=(r*O-n*W-s*N)*G,e[2]=(v*_-p*E+m*b)*G,e[3]=(d*E-h*_-f*b)*G,e[4]=(l*R-o*W-c*D)*G,e[5]=(t*W-r*R+s*D)*G,e[6]=(p*y-g*_-m*A)*G,e[7]=(u*_-d*y+f*A)*G,e[8]=(o*O-a*R+c*S)*G,e[9]=(n*R-t*O-s*S)*G,e[10]=(g*E-v*y+m*x)*G,e[11]=(h*y-u*E-f*x)*G,e[12]=(a*D-o*N-l*S)*G,e[13]=(t*N-n*D+r*S)*G,e[14]=(v*A-g*b-p*x)*G,e[15]=(u*b-h*A+d*x)*G,this}scale(e){const t=this.elements,n=e.x,r=e.y,s=e.z;return t[0]*=n,t[4]*=r,t[8]*=s,t[1]*=n,t[5]*=r,t[9]*=s,t[2]*=n,t[6]*=r,t[10]*=s,t[3]*=n,t[7]*=r,t[11]*=s,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],r=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,r))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const n=Math.cos(t),r=Math.sin(t),s=1-n,o=e.x,a=e.y,l=e.z,c=s*o,u=s*a;return this.set(c*o+n,c*a-r*l,c*l+r*a,0,c*a+r*l,u*a+n,u*l-r*o,0,c*l-r*a,u*l+r*o,s*l*l+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,r,s,o){return this.set(1,n,s,0,e,1,o,0,t,r,1,0,0,0,0,1),this}compose(e,t,n){const r=this.elements,s=t._x,o=t._y,a=t._z,l=t._w,c=s+s,u=o+o,h=a+a,d=s*c,f=s*u,g=s*h,v=o*u,p=o*h,m=a*h,x=l*c,A=l*u,y=l*h,b=n.x,E=n.y,_=n.z;return r[0]=(1-(v+m))*b,r[1]=(f+y)*b,r[2]=(g-A)*b,r[3]=0,r[4]=(f-y)*E,r[5]=(1-(d+m))*E,r[6]=(p+x)*E,r[7]=0,r[8]=(g+A)*_,r[9]=(p-x)*_,r[10]=(1-(d+v))*_,r[11]=0,r[12]=e.x,r[13]=e.y,r[14]=e.z,r[15]=1,this}decompose(e,t,n){const r=this.elements;e.x=r[12],e.y=r[13],e.z=r[14];const s=this.determinantAffine();if(s===0)return n.set(1,1,1),t.identity(),this;let o=Wi.set(r[0],r[1],r[2]).length();const a=Wi.set(r[4],r[5],r[6]).length(),l=Wi.set(r[8],r[9],r[10]).length();s<0&&(o=-o),pn.copy(this);const c=1/o,u=1/a,h=1/l;return pn.elements[0]*=c,pn.elements[1]*=c,pn.elements[2]*=c,pn.elements[4]*=u,pn.elements[5]*=u,pn.elements[6]*=u,pn.elements[8]*=h,pn.elements[9]*=h,pn.elements[10]*=h,t.setFromRotationMatrix(pn),n.x=o,n.y=a,n.z=l,this}makePerspective(e,t,n,r,s,o,a=Mn,l=!1){const c=this.elements,u=2*s/(t-e),h=2*s/(n-r),d=(t+e)/(t-e),f=(n+r)/(n-r);let g,v;if(l)g=s/(o-s),v=o*s/(o-s);else if(a===Mn)g=-(o+s)/(o-s),v=-2*o*s/(o-s);else if(a===cs)g=-o/(o-s),v=-o*s/(o-s);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return c[0]=u,c[4]=0,c[8]=d,c[12]=0,c[1]=0,c[5]=h,c[9]=f,c[13]=0,c[2]=0,c[6]=0,c[10]=g,c[14]=v,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(e,t,n,r,s,o,a=Mn,l=!1){const c=this.elements,u=2/(t-e),h=2/(n-r),d=-(t+e)/(t-e),f=-(n+r)/(n-r);let g,v;if(l)g=1/(o-s),v=o/(o-s);else if(a===Mn)g=-2/(o-s),v=-(o+s)/(o-s);else if(a===cs)g=-1/(o-s),v=-s/(o-s);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return c[0]=u,c[4]=0,c[8]=0,c[12]=d,c[1]=0,c[5]=h,c[9]=0,c[13]=f,c[2]=0,c[6]=0,c[10]=g,c[14]=v,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(e){const t=this.elements,n=e.elements;for(let r=0;r<16;r++)if(t[r]!==n[r])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){const n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}};To.prototype.isMatrix4=!0;let Ve=To;const Wi=new C,pn=new Ve,qf=new C(0,0,0),Yf=new C(1,1,1),si=new C,Ss=new C,Jt=new C,dc=new Ve,fc=new Fe;class yn{constructor(e=0,t=0,n=0,r=yn.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=n,this._order=r}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,r=this._order){return this._x=e,this._y=t,this._z=n,this._order=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){const r=e.elements,s=r[0],o=r[4],a=r[8],l=r[1],c=r[5],u=r[9],h=r[2],d=r[6],f=r[10];switch(t){case"XYZ":this._y=Math.asin(nt(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-u,f),this._z=Math.atan2(-o,s)):(this._x=Math.atan2(d,c),this._z=0);break;case"YXZ":this._x=Math.asin(-nt(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(a,f),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-h,s),this._z=0);break;case"ZXY":this._x=Math.asin(nt(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(-h,f),this._z=Math.atan2(-o,c)):(this._y=0,this._z=Math.atan2(l,s));break;case"ZYX":this._y=Math.asin(-nt(h,-1,1)),Math.abs(h)<.9999999?(this._x=Math.atan2(d,f),this._z=Math.atan2(l,s)):(this._x=0,this._z=Math.atan2(-o,c));break;case"YZX":this._z=Math.asin(nt(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-u,c),this._y=Math.atan2(-h,s)):(this._x=0,this._y=Math.atan2(a,f));break;case"XZY":this._z=Math.asin(-nt(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(d,c),this._y=Math.atan2(a,s)):(this._x=Math.atan2(-u,f),this._y=0);break;default:De("Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return dc.makeRotationFromQuaternion(e),this.setFromRotationMatrix(dc,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return fc.setFromEuler(this),this.setFromQuaternion(fc,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}yn.DEFAULT_ORDER="XYZ";class Bh{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let Kf=0;const pc=new C,Xi=new Fe,Xn=new Ve,ys=new C,Lr=new C,$f=new C,Zf=new Fe,mc=new C(1,0,0),gc=new C(0,1,0),_c=new C(0,0,1),vc={type:"added"},Jf={type:"removed"},qi={type:"childadded",child:null},Bo={type:"childremoved",child:null};class ft extends Fi{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Kf++}),this.uuid=kn(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=ft.DEFAULT_UP.clone();const e=new C,t=new yn,n=new Fe,r=new C(1,1,1);function s(){n.setFromEuler(t,!1)}function o(){t.setFromQuaternion(n,void 0,!1)}t._onChange(s),n._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:r},modelViewMatrix:{value:new Ve},normalMatrix:{value:new Oe}}),this.matrix=new Ve,this.matrixWorld=new Ve,this.matrixAutoUpdate=ft.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=ft.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Bh,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale),this.pivot!==null&&this.position.copy(this.pivot).applyMatrix4(this.matrix).sub(this.pivot)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return Xi.setFromAxisAngle(e,t),this.quaternion.multiply(Xi),this}rotateOnWorldAxis(e,t){return Xi.setFromAxisAngle(e,t),this.quaternion.premultiply(Xi),this}rotateX(e){return this.rotateOnAxis(mc,e)}rotateY(e){return this.rotateOnAxis(gc,e)}rotateZ(e){return this.rotateOnAxis(_c,e)}translateOnAxis(e,t){return pc.copy(e).applyQuaternion(this.quaternion),this.position.add(pc.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(mc,e)}translateY(e){return this.translateOnAxis(gc,e)}translateZ(e){return this.translateOnAxis(_c,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(Xn.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?ys.copy(e):ys.set(e,t,n);const r=this.parent;this.updateWorldMatrix(!0,!1),Lr.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Xn.lookAt(Lr,ys,this.up):Xn.lookAt(ys,Lr,this.up),this.quaternion.setFromRotationMatrix(Xn),r&&(Xn.extractRotation(r.matrixWorld),Xi.setFromRotationMatrix(Xn),this.quaternion.premultiply(Xi.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(Xe("Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(vc),qi.child=e,this.dispatchEvent(qi),qi.child=null):Xe("Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(Jf),Bo.child=e,this.dispatchEvent(Bo),Bo.child=null),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),Xn.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),Xn.multiply(e.parent.matrixWorld)),e.applyMatrix4(Xn),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(vc),qi.child=e,this.dispatchEvent(qi),qi.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,r=this.children.length;n<r;n++){const o=this.children[n].getObjectByProperty(e,t);if(o!==void 0)return o}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);const r=this.children;for(let s=0,o=r.length;s<o;s++)r[s].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Lr,e,$f),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Lr,Zf,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}intersectsFrustum(){return!0}traverse(e){e(this);const t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);const e=this.pivot;if(e!==null){const t=e.x,n=e.y,r=e.z,s=this.matrix.elements;s[12]+=t-s[0]*t-s[4]*n-s[8]*r,s[13]+=n-s[1]*t-s[5]*n-s[9]*r,s[14]+=r-s[2]*t-s[6]*n-s[10]*r}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t,n=!1){const r=this.parent;if(e===!0&&r!==null&&r.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||n)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,n=!0),t===!0){const s=this.children;for(let o=0,a=s.length;o<a;o++)s[o].updateWorldMatrix(!1,!0,n)}}toJSON(e){const t=e===void 0||typeof e=="string",n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});const r={};r.uuid=this.uuid,r.type=this.type,r.name=this.name,r.castShadow=this.castShadow,r.receiveShadow=this.receiveShadow,r.visible=this.visible,r.frustumCulled=this.frustumCulled,r.renderOrder=this.renderOrder,r.static=this.static,r.matrixAutoUpdate=this.matrixAutoUpdate,Object.keys(this.userData).length>0&&(r.userData=this.userData),r.layers=this.layers.mask,r.matrix=this.matrix.toArray(),r.up=this.up.toArray(),this.pivot!==null&&(r.pivot=this.pivot.toArray()),this.morphTargetDictionary!==void 0&&(r.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(r.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(r.type="InstancedMesh",r.count=this.count,r.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(r.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(r.type="BatchedMesh",r.perObjectFrustumCulled=this.perObjectFrustumCulled,r.sortObjects=this.sortObjects,r.drawRanges=this._drawRanges,r.reservedRanges=this._reservedRanges,r.geometryInfo=this._geometryInfo.map(a=>({...a,boundingBox:a.boundingBox?a.boundingBox.toJSON():void 0,boundingSphere:a.boundingSphere?a.boundingSphere.toJSON():void 0})),r.instanceInfo=this._instanceInfo.map(a=>({...a})),r.availableInstanceIds=this._availableInstanceIds.slice(),r.availableGeometryIds=this._availableGeometryIds.slice(),r.nextIndexStart=this._nextIndexStart,r.nextVertexStart=this._nextVertexStart,r.geometryCount=this._geometryCount,r.maxInstanceCount=this._maxInstanceCount,r.maxVertexCount=this._maxVertexCount,r.maxIndexCount=this._maxIndexCount,r.geometryInitialized=this._geometryInitialized,r.matricesTexture=this._matricesTexture.toJSON(e),r.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(r.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(r.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(r.boundingBox=this.boundingBox.toJSON()));function s(a,l){return a[l.uuid]===void 0&&(a[l.uuid]=l.toJSON(e)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?r.background=this.background.toJSON():this.background.isTexture&&(r.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(r.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){r.geometry=s(e.geometries,this.geometry);const a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){const l=a.shapes;if(Array.isArray(l))for(let c=0,u=l.length;c<u;c++){const h=l[c];s(e.shapes,h)}else s(e.shapes,l)}}if(this.isSkinnedMesh&&(r.bindMode=this.bindMode,r.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(s(e.skeletons,this.skeleton),r.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const a=[];for(let l=0,c=this.material.length;l<c;l++)a.push(s(e.materials,this.material[l]));r.material=a}else r.material=s(e.materials,this.material);if(this.children.length>0){r.children=[];for(let a=0;a<this.children.length;a++)r.children.push(this.children[a].toJSON(e).object)}if(this.animations.length>0){r.animations=[];for(let a=0;a<this.animations.length;a++){const l=this.animations[a];r.animations.push(s(e.animations,l))}}if(t){const a=o(e.geometries),l=o(e.materials),c=o(e.textures),u=o(e.images),h=o(e.shapes),d=o(e.skeletons),f=o(e.animations),g=o(e.nodes);a.length>0&&(n.geometries=a),l.length>0&&(n.materials=l),c.length>0&&(n.textures=c),u.length>0&&(n.images=u),h.length>0&&(n.shapes=h),d.length>0&&(n.skeletons=d),f.length>0&&(n.animations=f),g.length>0&&(n.nodes=g)}return n.object=r,n;function o(a){const l=[];for(const c in a){const u=a[c];delete u.metadata,l.push(u)}return l}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.pivot=e.pivot!==null?e.pivot.clone():null,this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.static=e.static,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let n=0;n<e.children.length;n++){const r=e.children[n];this.add(r.clone())}return this}dispose(){this.dispatchEvent({type:"dispose"})}}ft.DEFAULT_UP=new C(0,1,0);ft.DEFAULT_MATRIX_AUTO_UPDATE=!0;ft.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;class $t extends ft{constructor(){super(),this.isGroup=!0,this.type="Group"}}const Qf={type:"move"};class ko{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new $t,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new $t,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new C,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new C),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new $t,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new C,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new C,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let r=null,s=null,o=null;const a=this._targetRay,l=this._grip,c=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(c&&e.hand){o=!0;for(const v of e.hand.values()){const p=t.getJointPose(v,n),m=this._getHandJoint(c,v);p!==null&&(m.matrix.fromArray(p.transform.matrix),m.matrix.decompose(m.position,m.quaternion,m.scale),m.matrixWorldNeedsUpdate=!0,m.jointRadius=p.radius),m.visible=p!==null}const u=c.joints["index-finger-tip"],h=c.joints["thumb-tip"],d=u.position.distanceTo(h.position),f=.02,g=.005;c.inputState.pinching&&d>f+g?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!c.inputState.pinching&&d<=f-g&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else l!==null&&e.gripSpace&&(s=t.getPose(e.gripSpace,n),s!==null&&(l.matrix.fromArray(s.transform.matrix),l.matrix.decompose(l.position,l.quaternion,l.scale),l.matrixWorldNeedsUpdate=!0,s.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(s.linearVelocity)):l.hasLinearVelocity=!1,s.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(s.angularVelocity)):l.hasAngularVelocity=!1,l.eventsEnabled&&l.dispatchEvent({type:"gripUpdated",data:e,target:this})));a!==null&&(r=t.getPose(e.targetRaySpace,n),r===null&&s!==null&&(r=s),r!==null&&(a.matrix.fromArray(r.transform.matrix),a.matrix.decompose(a.position,a.quaternion,a.scale),a.matrixWorldNeedsUpdate=!0,r.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(r.linearVelocity)):a.hasLinearVelocity=!1,r.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(r.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(Qf)))}return a!==null&&(a.visible=r!==null),l!==null&&(l.visible=s!==null),c!==null&&(c.visible=o!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const n=new $t;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}}const kh={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},oi={h:0,s:0,l:0},Ts={h:0,s:0,l:0};function Vo(i,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?i+(e-i)*6*t:t<1/2?e:t<2/3?i+(e-i)*6*(2/3-t):i}class Ne{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){const r=e;r&&r.isColor?this.copy(r):typeof r=="number"?this.setHex(r):typeof r=="string"&&this.setStyle(r)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=Pt){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,tt.colorSpaceToWorking(this,t),this}setRGB(e,t,n,r=tt.workingColorSpace){return this.r=e,this.g=t,this.b=n,tt.colorSpaceToWorking(this,r),this}setHSL(e,t,n,r=tt.workingColorSpace){if(e=Rl(e,1),t=nt(t,0,1),n=nt(n,0,1),t===0)this.r=this.g=this.b=n;else{const s=n<=.5?n*(1+t):n+t-n*t,o=2*n-s;this.r=Vo(o,s,e+1/3),this.g=Vo(o,s,e),this.b=Vo(o,s,e-1/3)}return tt.colorSpaceToWorking(this,r),this}setStyle(e,t=Pt){function n(s){s!==void 0&&parseFloat(s)<1&&De("Color: Alpha component of "+e+" will be ignored.")}let r;if(r=/^(\w+)\(([^\)]*)\)/.exec(e)){let s;const o=r[1],a=r[2];switch(o){case"rgb":case"rgba":if(s=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d+(?:\.\d+)?|\.\d+)\s*)?$/.exec(a))return n(s[4]),this.setRGB(Math.min(255,parseInt(s[1],10))/255,Math.min(255,parseInt(s[2],10))/255,Math.min(255,parseInt(s[3],10))/255,t);if(s=/^\s*(\d+(?:\.\d+)?|\.\d+)\%\s*,\s*(\d+(?:\.\d+)?|\.\d+)\%\s*,\s*(\d+(?:\.\d+)?|\.\d+)\%\s*(?:,\s*(\d+(?:\.\d+)?|\.\d+)\s*)?$/.exec(a))return n(s[4]),this.setRGB(Math.min(100,parseFloat(s[1]))/100,Math.min(100,parseFloat(s[2]))/100,Math.min(100,parseFloat(s[3]))/100,t);break;case"hsl":case"hsla":if(s=/^\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*,\s*(\d+(?:\.\d+)?|\.\d+)\%\s*,\s*(\d+(?:\.\d+)?|\.\d+)\%\s*(?:,\s*(\d+(?:\.\d+)?|\.\d+)\s*)?$/.exec(a))return n(s[4]),this.setHSL(parseFloat(s[1])/360,parseFloat(s[2])/100,parseFloat(s[3])/100,t);break;default:De("Color: Unknown color model "+e)}}else if(r=/^\#([A-Fa-f\d]+)$/.exec(e)){const s=r[1],o=s.length;if(o===3)return this.setRGB(parseInt(s.charAt(0),16)/15,parseInt(s.charAt(1),16)/15,parseInt(s.charAt(2),16)/15,t);if(o===6)return this.setHex(parseInt(s,16),t);De("Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=Pt){const n=kh[e.toLowerCase()];return n!==void 0?this.setHex(n,t):De("Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=ei(e.r),this.g=ei(e.g),this.b=ei(e.b),this}copyLinearToSRGB(e){return this.r=fr(e.r),this.g=fr(e.g),this.b=fr(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=Pt){return tt.workingToColorSpace(Gt.copy(this),e),Math.round(nt(Gt.r*255,0,255))*65536+Math.round(nt(Gt.g*255,0,255))*256+Math.round(nt(Gt.b*255,0,255))}getHexString(e=Pt){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=tt.workingColorSpace){tt.workingToColorSpace(Gt.copy(this),t);const n=Gt.r,r=Gt.g,s=Gt.b,o=Math.max(n,r,s),a=Math.min(n,r,s);let l,c;const u=(a+o)/2;if(a===o)l=0,c=0;else{const h=o-a;switch(c=u<=.5?h/(o+a):h/(2-o-a),o){case n:l=(r-s)/h+(r<s?6:0);break;case r:l=(s-n)/h+2;break;case s:l=(n-r)/h+4;break}l/=6}return e.h=l,e.s=c,e.l=u,e}getRGB(e,t=tt.workingColorSpace){return tt.workingToColorSpace(Gt.copy(this),t),e.r=Gt.r,e.g=Gt.g,e.b=Gt.b,e}getStyle(e=Pt){tt.workingToColorSpace(Gt.copy(this),e);const t=Gt.r,n=Gt.g,r=Gt.b;return e!==Pt?`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${r.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(r*255)})`}offsetHSL(e,t,n){return this.getHSL(oi),this.setHSL(oi.h+e,oi.s+t,oi.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(oi),e.getHSL(Ts);const n=ns(oi.h,Ts.h,t),r=ns(oi.s,Ts.s,t),s=ns(oi.l,Ts.l,t);return this.setHSL(n,r,s),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,n=this.g,r=this.b,s=e.elements;return this.r=s[0]*t+s[3]*n+s[6]*r,this.g=s[1]*t+s[4]*n+s[7]*r,this.b=s[2]*t+s[5]*n+s[8]*r,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const Gt=new Ne;Ne.NAMES=kh;class jf extends ft{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new yn,this.environmentIntensity=1,this.environmentRotation=new yn,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),this.background=e.background!==null?e.background.clone():null,this.environment=e.environment!==null?e.environment.clone():null,this.fog=e.fog!==null?e.fog.clone():null,this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),this.overrideMaterial=e.overrideMaterial!==null?e.overrideMaterial.clone():null,this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),t.object.backgroundBlurriness=this.backgroundBlurriness,t.object.backgroundIntensity=this.backgroundIntensity,t.object.backgroundRotation=this.backgroundRotation.toArray(),t.object.environmentIntensity=this.environmentIntensity,t.object.environmentRotation=this.environmentRotation.toArray(),t}}const mn=new C,qn=new C,Ho=new C,Yn=new C,Yi=new C,Ki=new C,xc=new C,zo=new C,Go=new C,Wo=new C,Xo=new xt,qo=new xt,Yo=new xt;class _n{constructor(e=new C,t=new C,n=new C){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,r){r.subVectors(n,t),mn.subVectors(e,t),r.cross(mn);const s=r.lengthSq();return s>0?r.multiplyScalar(1/Math.sqrt(s)):r.set(0,0,0)}static getBarycoord(e,t,n,r,s){mn.subVectors(r,t),qn.subVectors(n,t),Ho.subVectors(e,t);const o=mn.dot(mn),a=mn.dot(qn),l=mn.dot(Ho),c=qn.dot(qn),u=qn.dot(Ho),h=o*c-a*a;if(h===0)return s.set(0,0,0),null;const d=1/h,f=(c*l-a*u)*d,g=(o*u-a*l)*d;return s.set(1-f-g,g,f)}static containsPoint(e,t,n,r){return this.getBarycoord(e,t,n,r,Yn)===null?!1:Yn.x>=0&&Yn.y>=0&&Yn.x+Yn.y<=1}static getInterpolation(e,t,n,r,s,o,a,l){return this.getBarycoord(e,t,n,r,Yn)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(s,Yn.x),l.addScaledVector(o,Yn.y),l.addScaledVector(a,Yn.z),l)}static getInterpolatedAttribute(e,t,n,r,s,o){return Xo.setScalar(0),qo.setScalar(0),Yo.setScalar(0),Xo.fromBufferAttribute(e,t),qo.fromBufferAttribute(e,n),Yo.fromBufferAttribute(e,r),o.setScalar(0),o.addScaledVector(Xo,s.x),o.addScaledVector(qo,s.y),o.addScaledVector(Yo,s.z),o}static isFrontFacing(e,t,n,r){return mn.subVectors(n,t),qn.subVectors(e,t),mn.cross(qn).dot(r)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,r){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[r]),this}setFromAttributeAndIndices(e,t,n,r){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,r),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return mn.subVectors(this.c,this.b),qn.subVectors(this.a,this.b),mn.cross(qn).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return _n.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return _n.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,n,r,s){return _n.getInterpolation(e,this.a,this.b,this.c,t,n,r,s)}containsPoint(e){return _n.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return _n.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const n=this.a,r=this.b,s=this.c;let o,a;Yi.subVectors(r,n),Ki.subVectors(s,n),zo.subVectors(e,n);const l=Yi.dot(zo),c=Ki.dot(zo);if(l<=0&&c<=0)return t.copy(n);Go.subVectors(e,r);const u=Yi.dot(Go),h=Ki.dot(Go);if(u>=0&&h<=u)return t.copy(r);const d=l*h-u*c;if(d<=0&&l>=0&&u<=0&&l-u>0)return o=l/(l-u),t.copy(n).addScaledVector(Yi,o);Wo.subVectors(e,s);const f=Yi.dot(Wo),g=Ki.dot(Wo);if(g>=0&&f<=g)return t.copy(s);const v=f*c-l*g;if(v<=0&&c>=0&&g<=0)return a=c/(c-g),t.copy(n).addScaledVector(Ki,a);const p=u*g-f*h;if(p<=0&&h-u>=0&&f-g>=0)return xc.subVectors(s,r),a=(h-u)/(h-u+(f-g)),t.copy(r).addScaledVector(xc,a);const m=1/(p+v+d);return o=v*m,a=d*m,t.copy(n).addScaledVector(Yi,o).addScaledVector(Ki,a)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}class Vn{constructor(e=new C(1/0,1/0,1/0),t=new C(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(gn.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(gn.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const n=gn.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const n=e.geometry;if(n!==void 0){const s=n.getAttribute("position");if(t===!0&&s!==void 0&&e.isInstancedMesh!==!0&&e.isBatchedMesh!==!0)for(let o=0,a=s.count;o<a;o++)e.isMesh===!0?e.getVertexPosition(o,gn):gn.fromBufferAttribute(s,o),gn.applyMatrix4(e.matrixWorld),this.expandByPoint(gn);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),Es.copy(e.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),Es.copy(n.boundingBox)),Es.applyMatrix4(e.matrixWorld),this.union(Es)}const r=e.children;for(let s=0,o=r.length;s<o;s++)this.expandByObject(r[s],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,gn),gn.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(Ir),bs.subVectors(this.max,Ir),$i.subVectors(e.a,Ir),Zi.subVectors(e.b,Ir),Ji.subVectors(e.c,Ir),ai.subVectors(Zi,$i),li.subVectors(Ji,Zi),bi.subVectors($i,Ji);let t=[0,-ai.z,ai.y,0,-li.z,li.y,0,-bi.z,bi.y,ai.z,0,-ai.x,li.z,0,-li.x,bi.z,0,-bi.x,-ai.y,ai.x,0,-li.y,li.x,0,-bi.y,bi.x,0];return!Ko(t,$i,Zi,Ji,bs)||(t=[1,0,0,0,1,0,0,0,1],!Ko(t,$i,Zi,Ji,bs))?!1:(As.crossVectors(ai,li),t=[As.x,As.y,As.z],Ko(t,$i,Zi,Ji,bs))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,gn).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(gn).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(Kn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),Kn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),Kn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),Kn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),Kn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),Kn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),Kn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),Kn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(Kn),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}}const Kn=[new C,new C,new C,new C,new C,new C,new C,new C],gn=new C,Es=new Vn,$i=new C,Zi=new C,Ji=new C,ai=new C,li=new C,bi=new C,Ir=new C,bs=new C,As=new C,Ai=new C;function Ko(i,e,t,n,r){for(let s=0,o=i.length-3;s<=o;s+=3){Ai.fromArray(i,s);const a=r.x*Math.abs(Ai.x)+r.y*Math.abs(Ai.y)+r.z*Math.abs(Ai.z),l=e.dot(Ai),c=t.dot(Ai),u=n.dot(Ai);if(Math.max(-Math.max(l,c,u),Math.min(l,c,u))>a)return!1}return!0}const Ct=new C,ws=new Ye;let e0=0;class vt extends Fi{constructor(e,t,n=!1){if(super(),Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:e0++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=n,this.usage=Dh,this.updateRanges=[],this.gpuType=ln,this.version=0,this._normalizationScale=e!==void 0?Eo(e):void 0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this._normalizationScale=e._normalizationScale,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let r=0,s=this.itemSize;r<s;r++)this.array[e+r]=t.array[n+r];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)ws.fromBufferAttribute(this,t),ws.applyMatrix3(e),this.setXY(t,ws.x,ws.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)Ct.fromBufferAttribute(this,t),Ct.applyMatrix3(e),this.setXYZ(t,Ct.x,Ct.y,Ct.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)Ct.fromBufferAttribute(this,t),Ct.applyMatrix4(e),this.setXYZ(t,Ct.x,Ct.y,Ct.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)Ct.fromBufferAttribute(this,t),Ct.applyNormalMatrix(e),this.setXYZ(t,Ct.x,Ct.y,Ct.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)Ct.fromBufferAttribute(this,t),Ct.transformDirection(e),this.setXYZ(t,Ct.x,Ct.y,Ct.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=this._denormalize(n)),n}setComponent(e,t,n){return this.normalized&&(n=this._normalize(n)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=this._denormalize(t)),t}setX(e,t){return this.normalized&&(t=this._normalize(t)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=this._denormalize(t)),t}setY(e,t){return this.normalized&&(t=this._normalize(t)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=this._denormalize(t)),t}setZ(e,t){return this.normalized&&(t=this._normalize(t)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=this._denormalize(t)),t}setW(e,t){return this.normalized&&(t=this._normalize(t)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=this._normalize(t),n=this._normalize(n)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,r){return e*=this.itemSize,this.normalized&&(t=this._normalize(t),n=this._normalize(n),r=this._normalize(r)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=r,this}setXYZW(e,t,n,r,s){return e*=this.itemSize,this.normalized&&(t=this._normalize(t),n=this._normalize(n),r=this._normalize(r),s=this._normalize(s)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=r,this.array[e+3]=s,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return e.name=this.name,e.usage=this.usage,e.gpuType=this.gpuType,e}dispose(){this.dispatchEvent({type:"dispose"})}_denormalize(e){const t=this._normalizationScale;return t!==void 0?Math.max(e/t,-1):Cl(e,this.array)}_normalize(e){const t=this._normalizationScale;return t!==void 0?Math.round(e*t):Pl(e,this.array)}}class Vh extends vt{constructor(e,t,n){super(new Uint16Array(e),t,n)}}class Hh extends vt{constructor(e,t,n){super(new Uint32Array(e),t,n)}}class Nt extends vt{constructor(e,t,n){super(new Float32Array(e),t,n)}}const t0=new Vn,Nr=new C,$o=new C;class Hn{constructor(e=new C,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const n=this.center;t!==void 0?n.copy(t):t0.setFromPoints(e).getCenter(n);let r=0;for(let s=0,o=e.length;s<o;s++)r=Math.max(r,n.distanceToSquared(e[s]));return this.radius=Math.sqrt(r),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;Nr.subVectors(e,this.center);const t=Nr.lengthSq();if(t>this.radius*this.radius){const n=Math.sqrt(t),r=(n-this.radius)*.5;this.center.addScaledVector(Nr,r/n),this.radius+=r}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):($o.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(Nr.copy(e.center).add($o)),this.expandByPoint(Nr.copy(e.center).sub($o))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}}let n0=0;const rn=new Ve,Zo=new ft,Qi=new C,Qt=new Vn,Dr=new Vn,Ft=new C;class Et extends Fi{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:n0++}),this.uuid=kn(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(Mf(e)?Hh:Vh)(e,1):this.index=e,this}setIndirect(e,t=0){return this.indirect=e,this.indirectOffset=t,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const n=this.attributes.normal;if(n!==void 0){const s=new Oe().getNormalMatrix(e);n.applyNormalMatrix(s),n.needsUpdate=!0}const r=this.attributes.tangent;return r!==void 0&&(r.transformDirection(e),r.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(e){return rn.makeRotationFromQuaternion(e),this.applyMatrix4(rn),this}rotateX(e){return rn.makeRotationX(e),this.applyMatrix4(rn),this}rotateY(e){return rn.makeRotationY(e),this.applyMatrix4(rn),this}rotateZ(e){return rn.makeRotationZ(e),this.applyMatrix4(rn),this}translate(e,t,n){return rn.makeTranslation(e,t,n),this.applyMatrix4(rn),this}scale(e,t,n){return rn.makeScale(e,t,n),this.applyMatrix4(rn),this}lookAt(e){return Zo.lookAt(e),Zo.updateMatrix(),this.applyMatrix4(Zo.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Qi).negate(),this.translate(Qi.x,Qi.y,Qi.z),this}setFromPoints(e){const t=this.getAttribute("position");if(t===void 0){const n=[];for(let r=0,s=e.length;r<s;r++){const o=e[r];n.push(o.x,o.y,o.z||0)}this.setAttribute("position",new Nt(n,3))}else{const n=Math.min(e.length,t.count);for(let r=0;r<n;r++){const s=e[r];t.setXYZ(r,s.x,s.y,s.z||0)}e.length>t.count&&De("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Vn);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Xe("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new C(-1/0,-1/0,-1/0),new C(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let n=0,r=t.length;n<r;n++){const s=t[n];Qt.setFromBufferAttribute(s),this.morphTargetsRelative?(Ft.addVectors(this.boundingBox.min,Qt.min),this.boundingBox.expandByPoint(Ft),Ft.addVectors(this.boundingBox.max,Qt.max),this.boundingBox.expandByPoint(Ft)):(this.boundingBox.expandByPoint(Qt.min),this.boundingBox.expandByPoint(Qt.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&Xe('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Hn);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Xe("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new C,1/0);return}if(e){const n=this.boundingSphere.center;if(Qt.setFromBufferAttribute(e),t)for(let s=0,o=t.length;s<o;s++){const a=t[s];Dr.setFromBufferAttribute(a),this.morphTargetsRelative?(Ft.addVectors(Qt.min,Dr.min),Qt.expandByPoint(Ft),Ft.addVectors(Qt.max,Dr.max),Qt.expandByPoint(Ft)):(Qt.expandByPoint(Dr.min),Qt.expandByPoint(Dr.max))}Qt.getCenter(n);let r=0;for(let s=0,o=e.count;s<o;s++)Ft.fromBufferAttribute(e,s),r=Math.max(r,n.distanceToSquared(Ft));if(t)for(let s=0,o=t.length;s<o;s++){const a=t[s],l=this.morphTargetsRelative;for(let c=0,u=a.count;c<u;c++)Ft.fromBufferAttribute(a,c),l&&(Qi.fromBufferAttribute(e,c),Ft.add(Qi)),r=Math.max(r,n.distanceToSquared(Ft))}this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&Xe('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){Xe("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const n=t.position,r=t.normal,s=t.uv;let o=this.getAttribute("tangent");(o===void 0||o.count!==n.count)&&(o=new vt(new Float32Array(4*n.count),4),this.setAttribute("tangent",o));const a=[],l=[],c=new Uint8Array(n.count);for(let D=0;D<n.count;D++)a[D]=new C,l[D]=new C;const u=new C,h=new C,d=new C,f=new Ye,g=new Ye,v=new Ye,p=new C,m=new C;function x(D,R,N){c[D]=c[R]=c[N]=1,u.fromBufferAttribute(n,D),h.fromBufferAttribute(n,R),d.fromBufferAttribute(n,N),f.fromBufferAttribute(s,D),g.fromBufferAttribute(s,R),v.fromBufferAttribute(s,N),h.sub(u),d.sub(u),g.sub(f),v.sub(f);const O=1/(g.x*v.y-v.x*g.y);isFinite(O)&&(p.copy(h).multiplyScalar(v.y).addScaledVector(d,-g.y).multiplyScalar(O),m.copy(d).multiplyScalar(g.x).addScaledVector(h,-v.x).multiplyScalar(O),a[D].add(p),a[R].add(p),a[N].add(p),l[D].add(m),l[R].add(m),l[N].add(m))}let A=this.groups;A.length===0&&(A=[{start:0,count:e.count}]);for(let D=0,R=A.length;D<R;++D){const N=A[D],O=N.start,W=N.count;for(let L=O,G=O+W;L<G;L+=3)x(e.getX(L+0),e.getX(L+1),e.getX(L+2))}const y=new C,b=new C,E=new C,_=new C;function S(D){E.fromBufferAttribute(r,D),_.copy(E);const R=a[D];y.copy(R),y.sub(E.multiplyScalar(E.dot(R))).normalize(),b.crossVectors(_,R);const O=b.dot(l[D])<0?-1:1;o.setXYZW(D,y.x,y.y,y.z,O)}for(let D=0,R=n.count;D<R;++D)c[D]&&S(D);this._transformed=!0}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let n=this.getAttribute("normal");if(n===void 0||n.count!==t.count)n=new vt(new Float32Array(t.count*3),3),this.setAttribute("normal",n);else for(let d=0,f=n.count;d<f;d++)n.setXYZ(d,0,0,0);const r=new C,s=new C,o=new C,a=new C,l=new C,c=new C,u=new C,h=new C;if(e)for(let d=0,f=e.count;d<f;d+=3){const g=e.getX(d+0),v=e.getX(d+1),p=e.getX(d+2);r.fromBufferAttribute(t,g),s.fromBufferAttribute(t,v),o.fromBufferAttribute(t,p),u.subVectors(o,s),h.subVectors(r,s),u.cross(h),a.fromBufferAttribute(n,g),l.fromBufferAttribute(n,v),c.fromBufferAttribute(n,p),a.add(u),l.add(u),c.add(u),n.setXYZ(g,a.x,a.y,a.z),n.setXYZ(v,l.x,l.y,l.z),n.setXYZ(p,c.x,c.y,c.z)}else for(let d=0,f=t.count;d<f;d+=3)r.fromBufferAttribute(t,d+0),s.fromBufferAttribute(t,d+1),o.fromBufferAttribute(t,d+2),u.subVectors(o,s),h.subVectors(r,s),u.cross(h),n.setXYZ(d+0,u.x,u.y,u.z),n.setXYZ(d+1,u.x,u.y,u.z),n.setXYZ(d+2,u.x,u.y,u.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)Ft.fromBufferAttribute(e,t),Ft.normalize(),e.setXYZ(t,Ft.x,Ft.y,Ft.z)}toNonIndexed(){function e(a,l){const c=a.array,u=a.itemSize,h=a.normalized,d=new c.constructor(l.length*u);let f=0,g=0;for(let v=0,p=l.length;v<p;v++){a.isInterleavedBufferAttribute?f=l[v]*a.data.stride+a.offset:f=l[v]*u;for(let m=0;m<u;m++)d[g++]=c[f++]}return new vt(d,u,h)}if(this.index===null)return De("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new Et,n=this.index.array,r=this.attributes;for(const a in r){const l=r[a],c=e(l,n);t.setAttribute(a,c)}const s=this.morphAttributes;for(const a in s){const l=[],c=s[a];for(let u=0,h=c.length;u<h;u++){const d=c[u],f=e(d,n);l.push(f)}t.morphAttributes[a]=l}t.morphTargetsRelative=this.morphTargetsRelative;const o=this.groups;for(let a=0,l=o.length;a<l;a++){const c=o[a];t.addGroup(c.start,c.count,c.materialIndex)}return t}toJSON(){const e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.parameters!==void 0&&this._transformed===!0?"BufferGeometry":this.type,e.name=this.name,Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){const l=this.parameters;for(const c in l)l[c]!==void 0&&(e[c]=l[c]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const n=this.attributes;for(const l in n){const c=n[l];e.data.attributes[l]=c.toJSON(e.data)}const r={};let s=!1;for(const l in this.morphAttributes){const c=this.morphAttributes[l],u=[];for(let h=0,d=c.length;h<d;h++){const f=c[h];u.push(f.toJSON(e.data))}u.length>0&&(r[l]=u,s=!0)}s&&(e.data.morphAttributes=r,e.data.morphTargetsRelative=this.morphTargetsRelative);const o=this.groups;o.length>0&&(e.data.groups=JSON.parse(JSON.stringify(o)));const a=this.boundingSphere;return a!==null&&(e.data.boundingSphere=a.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const n=e.index;n!==null&&this.setIndex(n.clone());const r=e.attributes;for(const c in r){const u=r[c];this.setAttribute(c,u.clone(t))}const s=e.morphAttributes;for(const c in s){const u=[],h=s[c];for(let d=0,f=h.length;d<f;d++)u.push(h[d].clone(t));this.morphAttributes[c]=u}this.morphTargetsRelative=e.morphTargetsRelative;const o=e.groups;for(let c=0,u=o.length;c<u;c++){const h=o[c];this.addGroup(h.start,h.count,h.materialIndex)}const a=e.boundingBox;a!==null&&(this.boundingBox=a.clone());const l=e.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this._transformed=e._transformed,this}dispose(){this.dispatchEvent({type:"dispose"})}}class Il{constructor(e,t){this.isInterleavedBuffer=!0,this.array=e,this.stride=t,this.count=e!==void 0?e.length/t:0,this.usage=Dh,this.updateRanges=[],this.version=0,this.uuid=kn()}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.array=new e.array.constructor(e.array),this.count=e.count,this.stride=e.stride,this.usage=e.usage,this}copyAt(e,t,n){e*=this.stride,n*=t.stride;for(let r=0,s=this.stride;r<s;r++)this.array[e+r]=t.array[n+r];return this}set(e,t=0){return this.array.set(e,t),this}clone(e){e.arrayBuffers===void 0&&(e.arrayBuffers={});const t=Mc(this.array);e.arrayBuffers[t]===void 0&&(e.arrayBuffers[t]=this.array.slice(0).buffer);const n=new this.array.constructor(e.arrayBuffers[t]),r=new this.constructor(n,this.stride);return r.setUsage(this.usage),r}onUpload(e){return this.onUploadCallback=e,this}toJSON(e){e.arrayBuffers===void 0&&(e.arrayBuffers={});const t=Mc(this.array);e.arrayBuffers[t]===void 0&&(e.arrayBuffers[t]=Array.from(new Uint32Array(this.array.slice(0).buffer)));const n={uuid:this.uuid,buffer:t,type:this.array.constructor.name,stride:this.stride};return n.usage=this.usage,n}}function Mc(i){return i.buffer._uuid===void 0&&(i.buffer._uuid=kn()),i.byteOffset===0&&i.byteLength===i.buffer.byteLength?i.buffer._uuid:i.buffer._uuid+":"+i.byteOffset+":"+i.byteLength}const Xt=new C;class ms{constructor(e,t,n,r=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=e,this.itemSize=t,this.offset=n,this.normalized=r,this._normalizationScale=e!==void 0?Eo(e.array):void 0}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(e){this.data.needsUpdate=e}applyMatrix4(e){for(let t=0,n=this.data.count;t<n;t++)Xt.fromBufferAttribute(this,t),Xt.applyMatrix4(e),this.setXYZ(t,Xt.x,Xt.y,Xt.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)Xt.fromBufferAttribute(this,t),Xt.applyNormalMatrix(e),this.setXYZ(t,Xt.x,Xt.y,Xt.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)Xt.fromBufferAttribute(this,t),Xt.transformDirection(e),this.setXYZ(t,Xt.x,Xt.y,Xt.z);return this}getComponent(e,t){let n=this.array[e*this.data.stride+this.offset+t];return this.normalized&&(n=this._denormalize(n)),n}setComponent(e,t,n){return this.normalized&&(n=this._normalize(n)),this.data.array[e*this.data.stride+this.offset+t]=n,this}setX(e,t){return this.normalized&&(t=this._normalize(t)),this.data.array[e*this.data.stride+this.offset]=t,this}setY(e,t){return this.normalized&&(t=this._normalize(t)),this.data.array[e*this.data.stride+this.offset+1]=t,this}setZ(e,t){return this.normalized&&(t=this._normalize(t)),this.data.array[e*this.data.stride+this.offset+2]=t,this}setW(e,t){return this.normalized&&(t=this._normalize(t)),this.data.array[e*this.data.stride+this.offset+3]=t,this}getX(e){let t=this.data.array[e*this.data.stride+this.offset];return this.normalized&&(t=this._denormalize(t)),t}getY(e){let t=this.data.array[e*this.data.stride+this.offset+1];return this.normalized&&(t=this._denormalize(t)),t}getZ(e){let t=this.data.array[e*this.data.stride+this.offset+2];return this.normalized&&(t=this._denormalize(t)),t}getW(e){let t=this.data.array[e*this.data.stride+this.offset+3];return this.normalized&&(t=this._denormalize(t)),t}setXY(e,t,n){return e=e*this.data.stride+this.offset,this.normalized&&(t=this._normalize(t),n=this._normalize(n)),this.data.array[e+0]=t,this.data.array[e+1]=n,this}setXYZ(e,t,n,r){return e=e*this.data.stride+this.offset,this.normalized&&(t=this._normalize(t),n=this._normalize(n),r=this._normalize(r)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=r,this}setXYZW(e,t,n,r,s){return e=e*this.data.stride+this.offset,this.normalized&&(t=this._normalize(t),n=this._normalize(n),r=this._normalize(r),s=this._normalize(s)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=r,this.data.array[e+3]=s,this}clone(e){if(e===void 0){fo("InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");const t=[];for(let n=0;n<this.count;n++){const r=n*this.data.stride+this.offset;for(let s=0;s<this.itemSize;s++)t.push(this.data.array[r+s])}return new vt(new this.array.constructor(t),this.itemSize,this.normalized)}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.clone(e)),new ms(e.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(e){if(e===void 0){fo("InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");const t=[];for(let n=0;n<this.count;n++){const r=n*this.data.stride+this.offset;for(let s=0;s<this.itemSize;s++)t.push(this.data.array[r+s])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:t,normalized:this.normalized}}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.toJSON(e)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}_denormalize(e){const t=this._normalizationScale;return t!==void 0?Math.max(e/t,-1):Cl(e,this.data.array)}_normalize(e){const t=this._normalizationScale;return t!==void 0?Math.round(e*t):Pl(e,this.data.array)}}const Jo=new C,i0=new C,r0=new Oe;class di{constructor(e=new C(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,r){return this.normal.set(e,t,n),this.constant=r,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){const r=Jo.subVectors(n,t).cross(i0.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(r,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t,n=!0){const r=e.delta(Jo),s=this.normal.dot(r);if(s===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const o=-(e.start.dot(this.normal)+this.constant)/s;return n===!0&&(o<0||o>1)?null:t.copy(e.start).addScaledVector(r,o)}intersectsLine(e){const t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const n=t||r0.getNormalMatrix(e),r=this.coplanarPoint(Jo).applyMatrix4(e),s=this.normal.applyMatrix3(n).normalize();return this.constant=-r.dot(s),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}toJSON(){return{normal:this.normal.toArray(),constant:this.constant}}fromJSON(e){return this.normal.fromArray(e.normal),this.constant=e.constant,this}}let s0=0;class Sn extends Fi{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:s0++}),this.uuid=kn(),this.name="",this.type="Material",this.blending=es,this.side=gi,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=fh,this.blendDst=ph,this.blendEquation=ar,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Ne(0,0,0),this.blendAlpha=0,this.depthFunc=rs,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=ff,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=No,this.stencilZFail=No,this.stencilZPass=No,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const n=e[t];if(n===void 0){De(`Material: parameter '${t}' has value of undefined.`);continue}const r=this[t];if(r===void 0){De(`Material: '${t}' is not a property of THREE.${this.type}.`);continue}r&&r.isColor?r.set(n):r&&r.isVector2&&n&&n.isVector2||r&&r.isEuler&&n&&n.isEuler||r&&r.isVector3&&n&&n.isVector3?r.copy(n):this[t]=n}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,n.blending=this.blending,n.side=this.side,n.shadowSide=this.shadowSide,n.vertexColors=this.vertexColors,n.opacity=this.opacity,n.transparent=this.transparent,n.blendSrc=this.blendSrc,n.blendDst=this.blendDst,n.blendEquation=this.blendEquation,n.blendSrcAlpha=this.blendSrcAlpha,n.blendDstAlpha=this.blendDstAlpha,n.blendEquationAlpha=this.blendEquationAlpha,n.blendColor=this.blendColor.getHex(),n.blendAlpha=this.blendAlpha,n.depthFunc=this.depthFunc,n.depthTest=this.depthTest,n.depthWrite=this.depthWrite,n.colorWrite=this.colorWrite,n.clipIntersection=this.clipIntersection,n.clipShadows=this.clipShadows,n.stencilWriteMask=this.stencilWriteMask,n.stencilFunc=this.stencilFunc,n.stencilRef=this.stencilRef,n.stencilFuncMask=this.stencilFuncMask,n.stencilFail=this.stencilFail,n.stencilZFail=this.stencilZFail,n.stencilZPass=this.stencilZPass,n.stencilWrite=this.stencilWrite,n.polygonOffset=this.polygonOffset,n.polygonOffsetFactor=this.polygonOffsetFactor,n.polygonOffsetUnits=this.polygonOffsetUnits,n.dithering=this.dithering,n.alphaTest=this.alphaTest,n.alphaHash=this.alphaHash,n.alphaToCoverage=this.alphaToCoverage,n.premultipliedAlpha=this.premultipliedAlpha,n.forceSinglePass=this.forceSinglePass,n.allowOverride=this.allowOverride,n.visible=this.visible,n.toneMapped=this.toneMapped,n.name=this.name,this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.diffuseRoughness!==void 0&&(n.diffuseRoughness=this.diffuseRoughness),this.diffuseRoughnessMap&&this.diffuseRoughnessMap.isTexture&&(n.diffuseRoughnessMap=this.diffuseRoughnessMap.toJSON(e).uuid),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.retroreflectivity!==void 0&&(n.retroreflectivity=this.retroreflectivity),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessMinimum!==void 0&&(n.iridescenceThicknessMinimum=this.iridescenceThicknessMinimum),this.iridescenceThicknessMaximum!==void 0&&(n.iridescenceThicknessMaximum=this.iridescenceThicknessMaximum),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),Array.isArray(this.clippingPlanes)&&this.clippingPlanes.length>0&&(n.clippingPlanes=this.clippingPlanes.map(s=>s.toJSON())),this.rotation!==void 0&&(n.rotation=this.rotation),this.depthPacking!==void 0&&(n.depthPacking=this.depthPacking),this.linewidth!==void 0&&(n.linewidth=this.linewidth),this.linecap!==void 0&&(n.linecap=this.linecap),this.linejoin!==void 0&&(n.linejoin=this.linejoin),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.wireframe!==void 0&&(n.wireframe=this.wireframe),this.wireframeLinewidth!==void 0&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!==void 0&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!==void 0&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading!==void 0&&(n.flatShading=this.flatShading),this.fog!==void 0&&(n.fog=this.fog),Object.keys(this.userData).length>0&&(n.userData=this.userData);function r(s){const o=[];for(const a in s){const l=s[a];delete l.metadata,o.push(l)}return o}if(t){const s=r(e.textures),o=r(e.images);s.length>0&&(n.textures=s),o.length>0&&(n.images=o)}return n}fromJSON(e,t){if(e.uuid!==void 0&&(this.uuid=e.uuid),e.name!==void 0&&(this.name=e.name),e.color!==void 0&&this.color!==void 0&&this.color.setHex(e.color),e.roughness!==void 0&&(this.roughness=e.roughness),e.metalness!==void 0&&(this.metalness=e.metalness),e.sheen!==void 0&&(this.sheen=e.sheen),e.sheenColor!==void 0&&(this.sheenColor=new Ne().setHex(e.sheenColor)),e.sheenRoughness!==void 0&&(this.sheenRoughness=e.sheenRoughness),e.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(e.emissive),e.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(e.specular),e.specularIntensity!==void 0&&(this.specularIntensity=e.specularIntensity),e.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(e.specularColor),e.shininess!==void 0&&(this.shininess=e.shininess),e.clearcoat!==void 0&&(this.clearcoat=e.clearcoat),e.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=e.clearcoatRoughness),e.diffuseRoughness!==void 0&&(this.diffuseRoughness=e.diffuseRoughness),e.dispersion!==void 0&&(this.dispersion=e.dispersion),e.retroreflectivity!==void 0&&(this.retroreflectivity=e.retroreflectivity),e.iridescence!==void 0&&(this.iridescence=e.iridescence),e.iridescenceIOR!==void 0&&(this.iridescenceIOR=e.iridescenceIOR),e.iridescenceThicknessMinimum!==void 0&&(this.iridescenceThicknessMinimum=e.iridescenceThicknessMinimum),e.iridescenceThicknessMaximum!==void 0&&(this.iridescenceThicknessMaximum=e.iridescenceThicknessMaximum),e.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessMinimum=e.iridescenceThicknessRange[0],this.iridescenceThicknessMaximum=e.iridescenceThicknessRange[1]),e.transmission!==void 0&&(this.transmission=e.transmission),e.thickness!==void 0&&(this.thickness=e.thickness),e.attenuationDistance!==void 0&&(this.attenuationDistance=e.attenuationDistance),e.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(e.attenuationColor),e.anisotropy!==void 0&&(this.anisotropy=e.anisotropy),e.anisotropyRotation!==void 0&&(this.anisotropyRotation=e.anisotropyRotation),e.fog!==void 0&&(this.fog=e.fog),e.flatShading!==void 0&&(this.flatShading=e.flatShading),e.blending!==void 0&&(this.blending=e.blending),e.combine!==void 0&&(this.combine=e.combine),e.side!==void 0&&(this.side=e.side),e.shadowSide!==void 0&&(this.shadowSide=e.shadowSide),e.opacity!==void 0&&(this.opacity=e.opacity),e.transparent!==void 0&&(this.transparent=e.transparent),e.alphaTest!==void 0&&(this.alphaTest=e.alphaTest),e.alphaHash!==void 0&&(this.alphaHash=e.alphaHash),e.depthFunc!==void 0&&(this.depthFunc=e.depthFunc),e.depthTest!==void 0&&(this.depthTest=e.depthTest),e.depthWrite!==void 0&&(this.depthWrite=e.depthWrite),e.colorWrite!==void 0&&(this.colorWrite=e.colorWrite),e.clippingPlanes!==void 0&&(this.clippingPlanes=e.clippingPlanes.map(n=>new di().fromJSON(n))),e.clipIntersection!==void 0&&(this.clipIntersection=e.clipIntersection),e.clipShadows!==void 0&&(this.clipShadows=e.clipShadows),e.depthPacking!==void 0&&(this.depthPacking=e.depthPacking),e.blendSrc!==void 0&&(this.blendSrc=e.blendSrc),e.blendDst!==void 0&&(this.blendDst=e.blendDst),e.blendEquation!==void 0&&(this.blendEquation=e.blendEquation),e.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=e.blendSrcAlpha),e.blendDstAlpha!==void 0&&(this.blendDstAlpha=e.blendDstAlpha),e.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=e.blendEquationAlpha),e.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(e.blendColor),e.blendAlpha!==void 0&&(this.blendAlpha=e.blendAlpha),e.stencilWriteMask!==void 0&&(this.stencilWriteMask=e.stencilWriteMask),e.stencilFunc!==void 0&&(this.stencilFunc=e.stencilFunc),e.stencilRef!==void 0&&(this.stencilRef=e.stencilRef),e.stencilFuncMask!==void 0&&(this.stencilFuncMask=e.stencilFuncMask),e.stencilFail!==void 0&&(this.stencilFail=e.stencilFail),e.stencilZFail!==void 0&&(this.stencilZFail=e.stencilZFail),e.stencilZPass!==void 0&&(this.stencilZPass=e.stencilZPass),e.stencilWrite!==void 0&&(this.stencilWrite=e.stencilWrite),e.wireframe!==void 0&&(this.wireframe=e.wireframe),e.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=e.wireframeLinewidth),e.wireframeLinecap!==void 0&&(this.wireframeLinecap=e.wireframeLinecap),e.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=e.wireframeLinejoin),e.rotation!==void 0&&(this.rotation=e.rotation),e.linewidth!==void 0&&(this.linewidth=e.linewidth),e.linecap!==void 0&&(this.linecap=e.linecap),e.linejoin!==void 0&&(this.linejoin=e.linejoin),e.dashSize!==void 0&&(this.dashSize=e.dashSize),e.gapSize!==void 0&&(this.gapSize=e.gapSize),e.scale!==void 0&&(this.scale=e.scale),e.polygonOffset!==void 0&&(this.polygonOffset=e.polygonOffset),e.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=e.polygonOffsetFactor),e.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=e.polygonOffsetUnits),e.dithering!==void 0&&(this.dithering=e.dithering),e.alphaToCoverage!==void 0&&(this.alphaToCoverage=e.alphaToCoverage),e.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=e.premultipliedAlpha),e.forceSinglePass!==void 0&&(this.forceSinglePass=e.forceSinglePass),e.allowOverride!==void 0&&(this.allowOverride=e.allowOverride),e.visible!==void 0&&(this.visible=e.visible),e.toneMapped!==void 0&&(this.toneMapped=e.toneMapped),e.userData!==void 0&&(this.userData=e.userData),e.vertexColors!==void 0&&(typeof e.vertexColors=="number"?this.vertexColors=e.vertexColors>0:this.vertexColors=e.vertexColors),e.size!==void 0&&(this.size=e.size),e.sizeAttenuation!==void 0&&(this.sizeAttenuation=e.sizeAttenuation),e.map!==void 0&&(this.map=t[e.map]||null),e.matcap!==void 0&&(this.matcap=t[e.matcap]||null),e.alphaMap!==void 0&&(this.alphaMap=t[e.alphaMap]||null),e.bumpMap!==void 0&&(this.bumpMap=t[e.bumpMap]||null),e.bumpScale!==void 0&&(this.bumpScale=e.bumpScale),e.normalMap!==void 0&&(this.normalMap=t[e.normalMap]||null),e.normalMapType!==void 0&&(this.normalMapType=e.normalMapType),e.normalScale!==void 0){let n=e.normalScale;Array.isArray(n)===!1&&(n=[n,n]),this.normalScale=new Ye().fromArray(n)}return e.displacementMap!==void 0&&(this.displacementMap=t[e.displacementMap]||null),e.displacementScale!==void 0&&(this.displacementScale=e.displacementScale),e.displacementBias!==void 0&&(this.displacementBias=e.displacementBias),e.roughnessMap!==void 0&&(this.roughnessMap=t[e.roughnessMap]||null),e.metalnessMap!==void 0&&(this.metalnessMap=t[e.metalnessMap]||null),e.emissiveMap!==void 0&&(this.emissiveMap=t[e.emissiveMap]||null),e.emissiveIntensity!==void 0&&(this.emissiveIntensity=e.emissiveIntensity),e.specularMap!==void 0&&(this.specularMap=t[e.specularMap]||null),e.specularIntensityMap!==void 0&&(this.specularIntensityMap=t[e.specularIntensityMap]||null),e.specularColorMap!==void 0&&(this.specularColorMap=t[e.specularColorMap]||null),e.envMap!==void 0&&(this.envMap=t[e.envMap]||null),e.envMapRotation!==void 0&&this.envMapRotation.fromArray(e.envMapRotation),e.envMapIntensity!==void 0&&(this.envMapIntensity=e.envMapIntensity),e.reflectivity!==void 0&&(this.reflectivity=e.reflectivity),e.refractionRatio!==void 0&&(this.refractionRatio=e.refractionRatio),e.lightMap!==void 0&&(this.lightMap=t[e.lightMap]||null),e.lightMapIntensity!==void 0&&(this.lightMapIntensity=e.lightMapIntensity),e.aoMap!==void 0&&(this.aoMap=t[e.aoMap]||null),e.aoMapIntensity!==void 0&&(this.aoMapIntensity=e.aoMapIntensity),e.gradientMap!==void 0&&(this.gradientMap=t[e.gradientMap]||null),e.clearcoatMap!==void 0&&(this.clearcoatMap=t[e.clearcoatMap]||null),e.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=t[e.clearcoatRoughnessMap]||null),e.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=t[e.clearcoatNormalMap]||null),e.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new Ye().fromArray(e.clearcoatNormalScale)),e.diffuseRoughnessMap!==void 0&&(this.diffuseRoughnessMap=t[e.diffuseRoughnessMap]||null),e.iridescenceMap!==void 0&&(this.iridescenceMap=t[e.iridescenceMap]||null),e.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=t[e.iridescenceThicknessMap]||null),e.transmissionMap!==void 0&&(this.transmissionMap=t[e.transmissionMap]||null),e.thicknessMap!==void 0&&(this.thicknessMap=t[e.thicknessMap]||null),e.anisotropyMap!==void 0&&(this.anisotropyMap=t[e.anisotropyMap]||null),e.sheenColorMap!==void 0&&(this.sheenColorMap=t[e.sheenColorMap]||null),e.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=t[e.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let n=null;if(t!==null){const r=t.length;n=new Array(r);for(let s=0;s!==r;++s)n[s]=t[s].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.allowOverride=e.allowOverride,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}}const $n=new C,Qo=new C,Rs=new C,Cs=new C;class bo{constructor(e=new C,t=new C(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,$n)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=$n.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):($n.copy(this.origin).addScaledVector(this.direction,t),$n.distanceToSquared(e))}distanceSqToSegment(e,t,n,r){Qo.copy(e).add(t).multiplyScalar(.5),Rs.copy(t).sub(e).normalize(),Cs.copy(this.origin).sub(Qo);const s=e.distanceTo(t)*.5,o=-this.direction.dot(Rs),a=Cs.dot(this.direction),l=-Cs.dot(Rs),c=Cs.lengthSq(),u=Math.abs(1-o*o);let h,d,f,g;if(u>0)if(h=o*l-a,d=o*a-l,g=s*u,h>=0)if(d>=-g)if(d<=g){const v=1/u;h*=v,d*=v,f=h*(h+o*d+2*a)+d*(o*h+d+2*l)+c}else d=s,h=Math.max(0,-(o*d+a)),f=-h*h+d*(d+2*l)+c;else d=-s,h=Math.max(0,-(o*d+a)),f=-h*h+d*(d+2*l)+c;else d<=-g?(h=Math.max(0,-(-o*s+a)),d=h>0?-s:Math.min(Math.max(-s,-l),s),f=-h*h+d*(d+2*l)+c):d<=g?(h=0,d=Math.min(Math.max(-s,-l),s),f=d*(d+2*l)+c):(h=Math.max(0,-(o*s+a)),d=h>0?s:Math.min(Math.max(-s,-l),s),f=-h*h+d*(d+2*l)+c);else d=o>0?-s:s,h=Math.max(0,-(o*d+a)),f=-h*h+d*(d+2*l)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,h),r&&r.copy(Qo).addScaledVector(Rs,d),f}intersectSphere(e,t){if(e.radius<0)return null;$n.subVectors(e.center,this.origin);const n=$n.dot(this.direction),r=$n.dot($n)-n*n,s=e.radius*e.radius;if(r>s)return null;const o=Math.sqrt(s-r),a=n-o,l=n+o;return l<0?null:a<0?this.at(l,t):this.at(a,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){const n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,r,s,o,a,l;const c=1/this.direction.x,u=1/this.direction.y,h=1/this.direction.z,d=this.origin;return c>=0?(n=(e.min.x-d.x)*c,r=(e.max.x-d.x)*c):(n=(e.max.x-d.x)*c,r=(e.min.x-d.x)*c),u>=0?(s=(e.min.y-d.y)*u,o=(e.max.y-d.y)*u):(s=(e.max.y-d.y)*u,o=(e.min.y-d.y)*u),n>o||s>r||((s>n||isNaN(n))&&(n=s),(o<r||isNaN(r))&&(r=o),h>=0?(a=(e.min.z-d.z)*h,l=(e.max.z-d.z)*h):(a=(e.max.z-d.z)*h,l=(e.min.z-d.z)*h),n>l||a>r)||((a>n||n!==n)&&(n=a),(l<r||r!==r)&&(r=l),r<0)?null:this.at(n>=0?n:r,t)}intersectsBox(e){return this.intersectBox(e,$n)!==null}intersectTriangle(e,t,n,r,s){const o=this.origin,a=this.direction,l=a.x,c=a.y,u=a.z,h=e.x-o.x,d=e.y-o.y,f=e.z-o.z,g=t.x-o.x,v=t.y-o.y,p=t.z-o.z,m=n.x-o.x,x=n.y-o.y,A=n.z-o.z,y=Math.abs(l),b=Math.abs(c),E=Math.abs(u);let _,S,D,R,N,O,W,L,G,z,B,ee;if(y>=b&&y>=E?(D=l,O=h,G=g,ee=m,l>=0?(_=c,S=u,R=d,N=f,W=v,L=p,z=x,B=A):(_=u,S=c,R=f,N=d,W=p,L=v,z=A,B=x)):b>=E?(D=c,O=d,G=v,ee=x,c>=0?(_=u,S=l,R=f,N=h,W=p,L=g,z=A,B=m):(_=l,S=u,R=h,N=f,W=g,L=p,z=m,B=A)):(D=u,O=f,G=p,ee=A,u>=0?(_=l,S=c,R=h,N=d,W=g,L=v,z=m,B=x):(_=c,S=l,R=d,N=h,W=v,L=g,z=x,B=m)),D===0)return null;const Y=_/D,Z=S/D,te=1/D,ye=R-Y*O,ke=N-Z*O,Q=W-Y*G,me=L-Z*G,Me=z-Y*ee,Pe=B-Z*ee,_e=Me*me-Pe*Q,Be=ye*Pe-ke*Me,dt=Q*ke-me*ye;if(r){if(_e<0||Be<0||dt<0)return null}else if((_e<0||Be<0||dt<0)&&(_e>0||Be>0||dt>0))return null;const Ce=_e+Be+dt;if(Ce===0)return null;const Ke=te*(_e*O+Be*G+dt*ee);return(Ce>0?Ke<0:Ke>0)?null:this.at(Ke/Ce,s)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class Un extends Sn{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Ne(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new yn,this.combine=mh,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const Sc=new Ve,wi=new bo,Ps=new Hn,yc=new C,Ls=new C,Is=new C,Ns=new C,jo=new C,Ds=new C,Tc=new C,Us=new C;class wt extends ft{constructor(e=new Et,t=new Un){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0?this.morphTargetInfluences=e.morphTargetInfluences.slice():this.morphTargetInfluences=void 0,e.morphTargetDictionary!==void 0?this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary):this.morphTargetDictionary=void 0,this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const r=t[n[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,o=r.length;s<o;s++){const a=r[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=s}}}}getVertexPosition(e,t){const n=this.geometry,r=n.attributes.position,s=n.morphAttributes.position,o=n.morphTargetsRelative;t.fromBufferAttribute(r,e);const a=this.morphTargetInfluences;if(s&&a){Ds.set(0,0,0);for(let l=0,c=s.length;l<c;l++){const u=a[l],h=s[l];u!==0&&(jo.fromBufferAttribute(h,e),o?Ds.addScaledVector(jo,u):Ds.addScaledVector(jo.sub(t),u))}t.add(Ds)}return t}intersectsFrustum(e){return e.intersectsObject(this)}raycast(e,t){const n=this.geometry,r=this.material,s=this.matrixWorld;r!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),Ps.copy(n.boundingSphere),Ps.applyMatrix4(s),wi.copy(e.ray).recast(e.near),!(Ps.containsPoint(wi.origin)===!1&&(wi.intersectSphere(Ps,yc)===null||wi.origin.distanceToSquared(yc)>(e.far-e.near)**2))&&(Sc.copy(s).invert(),wi.copy(e.ray).applyMatrix4(Sc),!(n.boundingBox!==null&&wi.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(e,t,wi)))}_computeIntersections(e,t,n){let r;const s=this.geometry,o=this.material,a=s.index,l=s.attributes.position,c=s.attributes.uv,u=s.attributes.uv1,h=s.attributes.normal,d=s.groups,f=s.drawRange;if(a!==null)if(Array.isArray(o))for(let g=0,v=d.length;g<v;g++){const p=d[g],m=o[p.materialIndex],x=Math.max(p.start,f.start),A=Math.min(a.count,Math.min(p.start+p.count,f.start+f.count));for(let y=x,b=A;y<b;y+=3){const E=a.getX(y),_=a.getX(y+1),S=a.getX(y+2);r=Os(this,m,e,n,c,u,h,E,_,S),r&&(r.faceIndex=Math.floor(y/3),r.face.materialIndex=p.materialIndex,t.push(r))}}else{const g=Math.max(0,f.start),v=Math.min(a.count,f.start+f.count);for(let p=g,m=v;p<m;p+=3){const x=a.getX(p),A=a.getX(p+1),y=a.getX(p+2);r=Os(this,o,e,n,c,u,h,x,A,y),r&&(r.faceIndex=Math.floor(p/3),t.push(r))}}else if(l!==void 0)if(Array.isArray(o))for(let g=0,v=d.length;g<v;g++){const p=d[g],m=o[p.materialIndex],x=Math.max(p.start,f.start),A=Math.min(l.count,Math.min(p.start+p.count,f.start+f.count));for(let y=x,b=A;y<b;y+=3){const E=y,_=y+1,S=y+2;r=Os(this,m,e,n,c,u,h,E,_,S),r&&(r.faceIndex=Math.floor(y/3),r.face.materialIndex=p.materialIndex,t.push(r))}}else{const g=Math.max(0,f.start),v=Math.min(l.count,f.start+f.count);for(let p=g,m=v;p<m;p+=3){const x=p,A=p+1,y=p+2;r=Os(this,o,e,n,c,u,h,x,A,y),r&&(r.faceIndex=Math.floor(p/3),t.push(r))}}}}function o0(i,e,t,n,r,s,o,a){let l;if(e.side===Yt?l=n.intersectTriangle(o,s,r,!0,a):l=n.intersectTriangle(r,s,o,e.side===gi,a),l===null)return null;Us.copy(a),Us.applyMatrix4(i.matrixWorld);const c=t.ray.origin.distanceTo(Us);return c<t.near||c>t.far?null:{distance:c,point:Us.clone(),object:i}}function Os(i,e,t,n,r,s,o,a,l,c){i.getVertexPosition(a,Ls),i.getVertexPosition(l,Is),i.getVertexPosition(c,Ns);const u=o0(i,e,t,n,Ls,Is,Ns,Tc);if(u){const h=new C;_n.getBarycoord(Tc,Ls,Is,Ns,h),r&&(u.uv=_n.getInterpolatedAttribute(r,a,l,c,h,new Ye)),s&&(u.uv1=_n.getInterpolatedAttribute(s,a,l,c,h,new Ye)),o&&(u.normal=_n.getInterpolatedAttribute(o,a,l,c,h,new C),u.normal.dot(n.direction)>0&&u.normal.multiplyScalar(-1));const d={a,b:l,c,normal:new C,materialIndex:0};_n.getNormal(Ls,Is,Ns,d.normal),u.face=d,u.barycoord=h}return u}const Ur=new xt,Ec=new xt,bc=new xt,a0=new xt,Ac=new Ve,Fs=new C,ea=new Hn,wc=new Ve,ta=new bo;class zh extends wt{constructor(e,t){super(e,t),this.isSkinnedMesh=!0,this.type="SkinnedMesh",this.bindMode=tc,this.bindMatrix=new Ve,this.bindMatrixInverse=new Ve,this.boundingBox=null,this.boundingSphere=null}computeBoundingBox(){const e=this.geometry;this.boundingBox===null&&(this.boundingBox=new Vn),this.boundingBox.makeEmpty();const t=e.getAttribute("position");for(let n=0;n<t.count;n++)this.getVertexPosition(n,Fs),this.boundingBox.expandByPoint(Fs)}computeBoundingSphere(){const e=this.geometry;this.boundingSphere===null&&(this.boundingSphere=new Hn),this.boundingSphere.makeEmpty();const t=e.getAttribute("position");for(let n=0;n<t.count;n++)this.getVertexPosition(n,Fs),this.boundingSphere.expandByPoint(Fs)}copy(e,t){return super.copy(e,t),this.bindMode=e.bindMode,this.bindMatrix.copy(e.bindMatrix),this.bindMatrixInverse.copy(e.bindMatrixInverse),this.skeleton=e.skeleton,this.boundingBox=e.boundingBox!==null?e.boundingBox.clone():null,this.boundingSphere=e.boundingSphere!==null?e.boundingSphere.clone():null,this}raycast(e,t){const n=this.material,r=this.matrixWorld;n!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),ea.copy(this.boundingSphere),ea.applyMatrix4(r),e.ray.intersectsSphere(ea)!==!1&&(wc.copy(r).invert(),ta.copy(e.ray).applyMatrix4(wc),!(this.boundingBox!==null&&ta.intersectsBox(this.boundingBox)===!1)&&this._computeIntersections(e,t,ta)))}getVertexPosition(e,t){return super.getVertexPosition(e,t),this.applyBoneTransform(e,t),t}bind(e,t){this.skeleton=e,t===void 0&&(this.updateMatrixWorld(!0),this.skeleton.calculateInverses(),t=this.matrixWorld),this.bindMatrix.copy(t),this.bindMatrixInverse.copy(t).invert()}pose(){this.skeleton.pose()}normalizeSkinWeights(){const e=new xt,t=this.geometry.attributes.skinWeight;for(let n=0,r=t.count;n<r;n++){e.fromBufferAttribute(t,n);const s=1/e.manhattanLength();s!==1/0?e.multiplyScalar(s):e.set(1,0,0,0),t.setXYZW(n,e.x,e.y,e.z,e.w)}}updateMatrixWorld(e){super.updateMatrixWorld(e),this.bindMode===tc?this.bindMatrixInverse.copy(this.matrixWorld).invert():this.bindMode===lf?this.bindMatrixInverse.copy(this.bindMatrix).invert():De("SkinnedMesh: Unrecognized bindMode: "+this.bindMode)}applyBoneTransform(e,t){const n=this.skeleton,r=this.geometry;Ec.fromBufferAttribute(r.attributes.skinIndex,e),bc.fromBufferAttribute(r.attributes.skinWeight,e),t.isVector4?(Ur.copy(t),t.set(0,0,0,0)):(Ur.set(t.x,t.y,t.z,1),t.set(0,0,0)),Ur.applyMatrix4(this.bindMatrix);for(let s=0;s<4;s++){const o=bc.getComponent(s);if(o!==0){const a=Ec.getComponent(s);Ac.multiplyMatrices(n.bones[a].matrixWorld,n.boneInverses[a]),t.addScaledVector(a0.copy(Ur).applyMatrix4(Ac),o)}}return t.isVector4&&(t.w=Ur.w),t.applyMatrix4(this.bindMatrixInverse)}}class Gh extends ft{constructor(){super(),this.isBone=!0,this.type="Bone"}}class Nl extends Lt{constructor(e=null,t=1,n=1,r,s,o,a,l,c=It,u=It,h,d){super(null,o,a,l,c,u,r,s,h,d),this.isDataTexture=!0,this.image={data:e,width:t,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const Rc=new Ve,l0=new Ve;class yr{constructor(e=[],t=[]){this.uuid=kn(),this.bones=e.slice(0),this.boneInverses=t,this.boneMatrices=null,this.previousBoneMatrices=null,this.boneTexture=null,this.previousBoneTexture=null,this.init()}init(){const e=this.bones,t=this.boneInverses;if(this.boneMatrices=new Float32Array(e.length*16),t.length===0)this.calculateInverses();else if(e.length!==t.length){De("Skeleton: Number of inverse bone matrices does not match amount of bones."),this.boneInverses=[];for(let n=0,r=this.bones.length;n<r;n++)this.boneInverses.push(new Ve)}}calculateInverses(){this.boneInverses.length=0;for(let e=0,t=this.bones.length;e<t;e++){const n=new Ve;this.bones[e]&&n.copy(this.bones[e].matrixWorld).invert(),this.boneInverses.push(n)}}pose(){for(let e=0,t=this.bones.length;e<t;e++){const n=this.bones[e];n&&n.matrixWorld.copy(this.boneInverses[e]).invert()}for(let e=0,t=this.bones.length;e<t;e++){const n=this.bones[e];n&&(n.parent&&n.parent.isBone?(n.matrix.copy(n.parent.matrixWorld).invert(),n.matrix.multiply(n.matrixWorld)):n.matrix.copy(n.matrixWorld),n.matrix.decompose(n.position,n.quaternion,n.scale))}}update(){const e=this.bones,t=this.boneInverses,n=this.boneMatrices,r=this.boneTexture;for(let s=0,o=e.length;s<o;s++){const a=e[s]?e[s].matrixWorld:l0;Rc.multiplyMatrices(a,t[s]),Rc.toArray(n,s*16)}r!==null&&(r.needsUpdate=!0)}clone(){return new yr(this.bones,this.boneInverses)}computeBoneTexture(){let e=Math.sqrt(this.bones.length*4);e=Math.ceil(e/4)*4,e=Math.max(e,4);const t=new Float32Array(e*e*4);t.set(this.boneMatrices);const n=new Nl(t,e,e,xn,ln);return n.needsUpdate=!0,this.boneMatrices=t,this.boneTexture=n,this}getBoneByName(e){for(let t=0,n=this.bones.length;t<n;t++){const r=this.bones[t];if(r.name===e)return r}}dispose(){this.boneTexture!==null&&(this.boneTexture.dispose(),this.boneTexture=null),this.previousBoneTexture!==null&&(this.previousBoneTexture.dispose(),this.previousBoneTexture=null)}fromJSON(e,t){this.uuid=e.uuid;for(let n=0,r=e.bones.length;n<r;n++){const s=e.bones[n];let o=t[s];o===void 0&&(De("Skeleton: No bone found with UUID:",s),o=new Gh),this.bones.push(o),this.boneInverses.push(new Ve().fromArray(e.boneInverses[n]))}return this.init(),this}toJSON(){const e={metadata:{version:4.7,type:"Skeleton",generator:"Skeleton.toJSON"},bones:[],boneInverses:[]};e.uuid=this.uuid;const t=this.bones,n=this.boneInverses;for(let r=0,s=t.length;r<s;r++){const o=t[r];e.bones.push(o.uuid);const a=n[r];e.boneInverses.push(a.toArray())}return e}}class po extends vt{constructor(e,t,n,r=1){super(e,t,n),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=r}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}toJSON(){const e=super.toJSON();return e.meshPerAttribute=this.meshPerAttribute,e.isInstancedBufferAttribute=!0,e}}const ji=new Ve,Cc=new Ve,Bs=[],Pc=new Vn,c0=new Ve,Or=new wt,Fr=new Hn;class u0 extends wt{constructor(e,t,n){super(e,t),this.isInstancedMesh=!0,this.instanceMatrix=new po(new Float32Array(n*16),16),this.instanceColor=null,this.morphTexture=null,this.count=n,this.boundingBox=null,this.boundingSphere=null;for(let r=0;r<n;r++)this.setMatrixAt(r,c0)}computeBoundingBox(){const e=this.geometry,t=this.count;this.boundingBox===null&&(this.boundingBox=new Vn),e.boundingBox===null&&e.computeBoundingBox(),this.boundingBox.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,ji),Pc.copy(e.boundingBox).applyMatrix4(ji),this.boundingBox.union(Pc)}computeBoundingSphere(){const e=this.geometry,t=this.count;this.boundingSphere===null&&(this.boundingSphere=new Hn),e.boundingSphere===null&&e.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,ji),Fr.copy(e.boundingSphere).applyMatrix4(ji),this.boundingSphere.union(Fr)}copy(e,t){return super.copy(e,t),this.instanceMatrix.copy(e.instanceMatrix),this.morphTexture=e.morphTexture!==null?e.morphTexture.clone():null,this.instanceColor=e.instanceColor!==null?e.instanceColor.clone():null,this.count=e.count,this.boundingBox=e.boundingBox!==null?e.boundingBox.clone():null,this.boundingSphere=e.boundingSphere!==null?e.boundingSphere.clone():null,this}getColorAt(e,t){return this.instanceColor===null?t.setRGB(1,1,1):t.fromArray(this.instanceColor.array,e*3)}getMatrixAt(e,t){return t.fromArray(this.instanceMatrix.array,e*16)}getMorphAt(e,t){const n=t.morphTargetInfluences,r=this.morphTexture.source.data.data,s=n.length+1,o=e*s+1;for(let a=0;a<n.length;a++)n[a]=r[o+a]}raycast(e,t){const n=this.matrixWorld,r=this.count;if(Or.geometry=this.geometry,Or.material=this.material,Or.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),Fr.copy(this.boundingSphere),Fr.applyMatrix4(n),e.ray.intersectsSphere(Fr)!==!1))for(let s=0;s<r;s++){this.getMatrixAt(s,ji),Cc.multiplyMatrices(n,ji),Or.matrixWorld=Cc,Or.raycast(e,Bs);for(let o=0,a=Bs.length;o<a;o++){const l=Bs[o];l.instanceId=s,l.object=this,t.push(l)}Bs.length=0}}setColorAt(e,t){return this.instanceColor===null&&(this.instanceColor=new po(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),t.toArray(this.instanceColor.array,e*3),this}setMatrixAt(e,t){return t.toArray(this.instanceMatrix.array,e*16),this}setMorphAt(e,t){const n=t.morphTargetInfluences,r=n.length+1;this.morphTexture===null&&(this.morphTexture=new Nl(new Float32Array(r*this.count),r,this.count,El,ln));const s=this.morphTexture.source.data.data;let o=0;for(let c=0;c<n.length;c++)o+=n[c];const a=this.geometry.morphTargetsRelative?1:1-o,l=r*e;return s[l]=a,s.set(n,l+1),this}updateMorphTargets(){}dispose(){super.dispose(),this.instanceMatrix.dispose(),this.instanceColor!==null&&this.instanceColor.dispose(),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null)}}const Ri=new Hn,h0=new Ye(.5,.5),ks=new C;class hs{constructor(e=new di,t=new di,n=new di,r=new di,s=new di,o=new di){this.planes=[e,t,n,r,s,o]}set(e,t,n,r,s,o){const a=this.planes;return a[0].copy(e),a[1].copy(t),a[2].copy(n),a[3].copy(r),a[4].copy(s),a[5].copy(o),this}copy(e){const t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=Mn,n=!1){const r=this.planes,s=e.elements,o=s[0],a=s[1],l=s[2],c=s[3],u=s[4],h=s[5],d=s[6],f=s[7],g=s[8],v=s[9],p=s[10],m=s[11],x=s[12],A=s[13],y=s[14],b=s[15];if(r[0].setComponents(c-o,f-u,m-g,b-x).normalize(),r[1].setComponents(c+o,f+u,m+g,b+x).normalize(),r[2].setComponents(c+a,f+h,m+v,b+A).normalize(),r[3].setComponents(c-a,f-h,m-v,b-A).normalize(),n)r[4].setComponents(l,d,p,y).normalize(),r[5].setComponents(c-l,f-d,m-p,b-y).normalize();else if(r[4].setComponents(c-l,f-d,m-p,b-y).normalize(),t===Mn)r[5].setComponents(c+l,f+d,m+p,b+y).normalize();else if(t===cs)r[5].setComponents(l,d,p,y).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),Ri.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),Ri.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(Ri)}intersectsSprite(e){Ri.center.set(0,0,0);const t=h0.distanceTo(e.center);return Ri.radius=.7071067811865476+t,Ri.applyMatrix4(e.matrixWorld),this.intersectsSphere(Ri)}intersectsSphere(e){const t=this.planes,n=e.center,r=-e.radius;for(let s=0;s<6;s++)if(t[s].distanceToPoint(n)<r)return!1;return!0}intersectsBox(e){const t=this.planes;for(let n=0;n<6;n++){const r=t[n];if(ks.x=r.normal.x>0?e.max.x:e.min.x,ks.y=r.normal.y>0?e.max.y:e.min.y,ks.z=r.normal.z>0?e.max.z:e.min.z,r.distanceToPoint(ks)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}const Lc=new Ve;class Dl{constructor(){this.coordinateSystem=Mn,this._frustums=[],this._count=0}setFromArrayCamera(e){const t=e.cameras,n=this._frustums;for(let r=0;r<t.length;r++){const s=t[r];Lc.multiplyMatrices(s.projectionMatrix,s.matrixWorldInverse),n[r]===void 0&&(n[r]=new hs),n[r].setFromProjectionMatrix(Lc,s.coordinateSystem,s.reversedDepth)}return this._count=t.length,this}getFrustum(e){return this._frustums[e]}intersectsObject(e){const t=this._frustums;for(let n=0;n<this._count;n++)if(t[n].intersectsObject(e))return!0;return!1}intersectsSprite(e){const t=this._frustums;for(let n=0;n<this._count;n++)if(t[n].intersectsSprite(e))return!0;return!1}intersectsSphere(e){const t=this._frustums;for(let n=0;n<this._count;n++)if(t[n].intersectsSphere(e))return!0;return!1}intersectsBox(e){const t=this._frustums;for(let n=0;n<this._count;n++)if(t[n].intersectsBox(e))return!0;return!1}containsPoint(e){const t=this._frustums;for(let n=0;n<this._count;n++)if(t[n].containsPoint(e))return!0;return!1}copy(e){this.coordinateSystem=e.coordinateSystem;const t=this._frustums,n=e._frustums;for(let r=0;r<e._count;r++)t[r]===void 0&&(t[r]=new hs),t[r].copy(n[r]);return this._count=e._count,this}clone(){return new Dl().copy(this)}}class Bi extends Sn{constructor(e){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new Ne(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}}const mo=new C,go=new C,Ic=new Ve,Br=new bo,Vs=new Hn,na=new C,Nc=new C;class Ao extends ft{constructor(e=new Et,t=new Bi){super(),this.isLine=!0,this.type="Line",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0?this.morphTargetInfluences=e.morphTargetInfluences.slice():this.morphTargetInfluences=void 0,e.morphTargetDictionary!==void 0?this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary):this.morphTargetDictionary=void 0,this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,n=[0];for(let r=1,s=t.count;r<s;r++)mo.fromBufferAttribute(t,r-1),go.fromBufferAttribute(t,r),n[r]=n[r-1],n[r]+=mo.distanceTo(go);e.setAttribute("lineDistance",new Nt(n,1))}else De("Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}intersectsFrustum(e){return e.intersectsObject(this)}raycast(e,t){const n=this.geometry,r=this.matrixWorld,s=e.params.Line.threshold,o=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Vs.copy(n.boundingSphere),Vs.applyMatrix4(r),Vs.radius+=s,e.ray.intersectsSphere(Vs)===!1)return;Ic.copy(r).invert(),Br.copy(e.ray).applyMatrix4(Ic);const a=s/((this.scale.x+this.scale.y+this.scale.z)/3),l=a*a,c=this.isLineSegments?2:1,u=n.index,d=n.attributes.position;if(u!==null){const f=Math.max(0,o.start),g=Math.min(u.count,o.start+o.count);for(let v=f,p=g-1;v<p;v+=c){const m=u.getX(v),x=u.getX(v+1),A=Hs(this,e,Br,l,m,x,v);A&&t.push(A)}if(this.isLineLoop){const v=u.getX(g-1),p=u.getX(f),m=Hs(this,e,Br,l,v,p,g-1);m&&t.push(m)}}else{const f=Math.max(0,o.start),g=Math.min(d.count,o.start+o.count);for(let v=f,p=g-1;v<p;v+=c){const m=Hs(this,e,Br,l,v,v+1,v);m&&t.push(m)}if(this.isLineLoop){const v=Hs(this,e,Br,l,g-1,f,g-1);v&&t.push(v)}}}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const r=t[n[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,o=r.length;s<o;s++){const a=r[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=s}}}}}function Hs(i,e,t,n,r,s,o){const a=i.geometry.attributes.position;if(mo.fromBufferAttribute(a,r),go.fromBufferAttribute(a,s),t.distanceSqToSegment(mo,go,na,Nc)>n)return;na.applyMatrix4(i.matrixWorld);const c=e.ray.origin.distanceTo(na);if(!(c<e.near||c>e.far))return{distance:c,point:Nc.clone().applyMatrix4(i.matrixWorld),index:o,face:null,faceIndex:null,barycoord:null,object:i}}const Dc=new C,Uc=new C;class gs extends Ao{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,n=[];for(let r=0,s=t.count;r<s;r+=2)Dc.fromBufferAttribute(t,r),Uc.fromBufferAttribute(t,r+1),n[r]=r===0?0:n[r-1],n[r+1]=n[r]+Dc.distanceTo(Uc);e.setAttribute("lineDistance",new Nt(n,1))}else De("LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}}class d0 extends Ao{constructor(e,t){super(e,t),this.isLineLoop=!0,this.type="LineLoop"}}class Wh extends Sn{constructor(e){super(),this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new Ne(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.size=e.size,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}}const Oc=new Ve,ll=new bo,zs=new Hn,Gs=new C;class f0 extends ft{constructor(e=new Et,t=new Wh){super(),this.isPoints=!0,this.type="Points",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0?this.morphTargetInfluences=e.morphTargetInfluences.slice():this.morphTargetInfluences=void 0,e.morphTargetDictionary!==void 0?this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary):this.morphTargetDictionary=void 0,this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}intersectsFrustum(e){return e.intersectsObject(this)}raycast(e,t){const n=this.geometry,r=this.matrixWorld,s=e.params.Points.threshold,o=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),zs.copy(n.boundingSphere),zs.applyMatrix4(r),zs.radius+=s,e.ray.intersectsSphere(zs)===!1)return;Oc.copy(r).invert(),ll.copy(e.ray).applyMatrix4(Oc);const a=s/((this.scale.x+this.scale.y+this.scale.z)/3),l=a*a,c=n.index,h=n.attributes.position;if(c!==null){const d=Math.max(0,o.start),f=Math.min(c.count,o.start+o.count);for(let g=d,v=f;g<v;g++){const p=c.getX(g);Gs.fromBufferAttribute(h,p),Fc(Gs,p,l,r,e,t,this)}}else{const d=Math.max(0,o.start),f=Math.min(h.count,o.start+o.count);for(let g=d,v=f;g<v;g++)Gs.fromBufferAttribute(h,g),Fc(Gs,g,l,r,e,t,this)}}updateMorphTargets(){const t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){const r=t[n[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,o=r.length;s<o;s++){const a=r[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=s}}}}}function Fc(i,e,t,n,r,s,o){const a=ll.distanceSqToPoint(i);if(a<t){const l=new C;ll.closestPointToPoint(i,l),l.applyMatrix4(n);const c=r.ray.origin.distanceTo(l);if(c<r.near||c>r.far)return;s.push({distance:c,distanceToRay:Math.sqrt(a),point:l,index:e,face:null,faceIndex:null,barycoord:null,object:o})}}class Xh extends Lt{constructor(e=[],t=gr,n,r,s,o,a,l,c,u){super(e,t,n,r,s,o,a,l,c,u),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class Bc extends Lt{constructor(e,t,n,r,s,o,a,l,c){super(e,t,n,r,s,o,a,l,c),this.isCanvasTexture=!0,this.needsUpdate=!0}}class xr extends Lt{constructor(e,t,n=Fn,r,s,o,a=It,l=It,c,u=vi,h=1){if(u!==vi&&u!==mi)throw new Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");const d={width:e,height:t,depth:h};super(d,r,s,o,a,l,u,n,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new Ll(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return t.compareFunction=this.compareFunction,t}}class qh extends xr{constructor(e,t=Fn,n=gr,r,s,o=It,a=It,l,c=vi){const u={width:e,height:e,depth:1},h=[u,u,u,u,u,u];super(e,e,t,n,r,s,o,a,l,c),this.image=h,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(e){this.image=e}}class Yh extends Lt{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}}class ki extends Et{constructor(e=1,t=1,n=1,r=1,s=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:n,widthSegments:r,heightSegments:s,depthSegments:o};const a=this;r=Math.floor(r),s=Math.floor(s),o=Math.floor(o);const l=[],c=[],u=[],h=[];let d=0,f=0;g("z","y","x",-1,-1,n,t,e,o,s,0),g("z","y","x",1,-1,n,t,-e,o,s,1),g("x","z","y",1,1,e,n,t,r,o,2),g("x","z","y",1,-1,e,n,-t,r,o,3),g("x","y","z",1,-1,e,t,n,r,s,4),g("x","y","z",-1,-1,e,t,-n,r,s,5),this.setIndex(l),this.setAttribute("position",new Nt(c,3)),this.setAttribute("normal",new Nt(u,3)),this.setAttribute("uv",new Nt(h,2));function g(v,p,m,x,A,y,b,E,_,S,D){const R=y/_,N=b/S,O=y/2,W=b/2,L=E/2,G=_+1,z=S+1;let B=0,ee=0;const Y=new C;for(let Z=0;Z<z;Z++){const te=Z*N-W;for(let ye=0;ye<G;ye++){const ke=ye*R-O;Y[v]=ke*x,Y[p]=te*A,Y[m]=L,c.push(Y.x,Y.y,Y.z),Y[v]=0,Y[p]=0,Y[m]=E>0?1:-1,u.push(Y.x,Y.y,Y.z),h.push(ye/_),h.push(1-Z/S),B+=1}}for(let Z=0;Z<S;Z++)for(let te=0;te<_;te++){const ye=d+te+G*Z,ke=d+te+G*(Z+1),Q=d+(te+1)+G*(Z+1),me=d+(te+1)+G*Z;l.push(ye,ke,me),l.push(ke,Q,me),ee+=6}a.addGroup(f,ee,D),f+=ee,d+=B}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new ki(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}class Ul extends Et{constructor(e=1,t=1,n=1,r=32,s=1,o=!1,a=0,l=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:e,radiusBottom:t,height:n,radialSegments:r,heightSegments:s,openEnded:o,thetaStart:a,thetaLength:l};const c=this;r=Math.floor(r),s=Math.floor(s);const u=[],h=[],d=[],f=[];let g=0;const v=[],p=n/2;let m=0;x(),o===!1&&(e>0&&A(!0),t>0&&A(!1)),this.setIndex(u),this.setAttribute("position",new Nt(h,3)),this.setAttribute("normal",new Nt(d,3)),this.setAttribute("uv",new Nt(f,2));function x(){const y=new C,b=new C;let E=0;const _=(t-e)/n;for(let S=0;S<=s;S++){const D=[],R=S/s,N=R*(t-e)+e;for(let O=0;O<=r;O++){const W=O/r,L=W*l+a,G=Math.sin(L),z=Math.cos(L);b.x=N*G,b.y=-R*n+p,b.z=N*z,h.push(b.x,b.y,b.z),y.set(G,_,z).normalize(),d.push(y.x,y.y,y.z),f.push(W,1-R),D.push(g++)}v.push(D)}for(let S=0;S<r;S++)for(let D=0;D<s;D++){const R=v[D][S],N=v[D+1][S],O=v[D+1][S+1],W=v[D][S+1];(e>0||D!==0)&&(u.push(R,N,W),E+=3),(t>0||D!==s-1)&&(u.push(N,O,W),E+=3)}c.addGroup(m,E,0),m+=E}function A(y){const b=g,E=new Ye,_=new C;let S=0;const D=y===!0?e:t,R=y===!0?1:-1;for(let O=1;O<=r;O++)h.push(0,p*R,0),d.push(0,R,0),f.push(.5,.5),g++;const N=g;for(let O=0;O<=r;O++){const L=O/r*l+a,G=Math.cos(L),z=Math.sin(L);_.x=D*z,_.y=p*R,_.z=D*G,h.push(_.x,_.y,_.z),d.push(0,R,0),E.x=G*.5+.5,E.y=z*.5*R+.5,f.push(E.x,E.y),g++}for(let O=0;O<r;O++){const W=b+O,L=N+O;y===!0?u.push(L,L+1,W):u.push(L+1,L,W),S+=3}c.addGroup(m,S,y===!0?1:2),m+=S}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Ul(e.radiusTop,e.radiusBottom,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}}class Mr extends Et{constructor(e=1,t=1,n=1,r=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:n,heightSegments:r};const s=e/2,o=t/2,a=Math.floor(n),l=Math.floor(r),c=a+1,u=l+1,h=e/a,d=t/l,f=[],g=[],v=[],p=[];for(let m=0;m<u;m++){const x=m*d-o;for(let A=0;A<c;A++){const y=A*h-s;g.push(y,-x,0),v.push(0,0,1),p.push(A/a),p.push(1-m/l)}}for(let m=0;m<l;m++)for(let x=0;x<a;x++){const A=x+c*m,y=x+c*(m+1),b=x+1+c*(m+1),E=x+1+c*m;f.push(A,y,E),f.push(y,b,E)}this.setIndex(f),this.setAttribute("position",new Nt(g,3)),this.setAttribute("normal",new Nt(v,3)),this.setAttribute("uv",new Nt(p,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Mr(e.width,e.height,e.widthSegments,e.heightSegments)}}class Ol extends Et{constructor(e=1,t=32,n=16,r=0,s=Math.PI*2,o=0,a=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:e,widthSegments:t,heightSegments:n,phiStart:r,phiLength:s,thetaStart:o,thetaLength:a},t=Math.max(3,Math.floor(t)),n=Math.max(2,Math.floor(n));const l=Math.min(o+a,Math.PI);let c=0;const u=[],h=new C,d=new C,f=[],g=[],v=[],p=[];for(let m=0;m<=n;m++){const x=[],A=m/n,y=o+A*a,b=e*Math.cos(y),E=Math.sqrt(e*e-b*b);let _=0;m===0&&o===0?_=.5/t:m===n&&l===Math.PI&&(_=-.5/t);for(let S=0;S<=t;S++){const D=S/t,R=r+D*s;h.x=-E*Math.cos(R),h.y=b,h.z=E*Math.sin(R),g.push(h.x,h.y,h.z),d.copy(h).normalize(),v.push(d.x,d.y,d.z),p.push(D+_,1-A),x.push(c++)}u.push(x)}for(let m=0;m<n;m++)for(let x=0;x<t;x++){const A=u[m][x+1],y=u[m][x],b=u[m+1][x],E=u[m+1][x+1];(m!==0||o>0)&&f.push(A,y,E),(m!==n-1||l<Math.PI)&&f.push(y,b,E)}this.setIndex(f),this.setAttribute("position",new Nt(g,3)),this.setAttribute("normal",new Nt(v,3)),this.setAttribute("uv",new Nt(p,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Ol(e.radius,e.widthSegments,e.heightSegments,e.phiStart,e.phiLength,e.thetaStart,e.thetaLength)}}function Sr(i){const e={};for(const t in i){e[t]={};for(const n in i[t]){const r=i[t][n];if(kc(r))r.isRenderTargetTexture?(De("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][n]=null):e[t][n]=r.clone();else if(Array.isArray(r))if(kc(r[0])){const s=[];for(let o=0,a=r.length;o<a;o++)s[o]=r[o].clone();e[t][n]=s}else e[t][n]=r.slice();else e[t][n]=r}}return e}function qt(i){const e={};for(let t=0;t<i.length;t++){const n=Sr(i[t]);for(const r in n)e[r]=n[r]}return e}function kc(i){return i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)}function p0(i){const e=[];for(let t=0;t<i.length;t++)e.push(i[t].clone());return e}function Kh(i){const e=i.getRenderTarget();return e===null?i.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:tt.workingColorSpace}const $h={clone:Sr,merge:qt};var m0=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,g0=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class xi extends Sn{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=m0,this.fragmentShader=g0,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Sr(e.uniforms),this.uniformsGroups=p0(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this.defaultAttributeValues=Object.assign({},e.defaultAttributeValues),this.index0AttributeName=e.index0AttributeName,this.uniformsNeedUpdate=e.uniformsNeedUpdate,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const r in this.uniforms){const o=this.uniforms[r].value;o&&o.isTexture?t.uniforms[r]={type:"t",value:o.toJSON(e).uuid}:o&&o.isColor?t.uniforms[r]={type:"c",value:o.getHex()}:o&&o.isVector2?t.uniforms[r]={type:"v2",value:o.toArray()}:o&&o.isVector3?t.uniforms[r]={type:"v3",value:o.toArray()}:o&&o.isVector4?t.uniforms[r]={type:"v4",value:o.toArray()}:o&&o.isMatrix3?t.uniforms[r]={type:"m3",value:o.toArray()}:o&&o.isMatrix4?t.uniforms[r]={type:"m4",value:o.toArray()}:t.uniforms[r]={value:o}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const n={};for(const r in this.extensions)this.extensions[r]===!0&&(n[r]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}fromJSON(e,t){if(super.fromJSON(e,t),e.uniforms!==void 0)for(const n in e.uniforms){const r=e.uniforms[n];switch(this.uniforms[n]={},r.type){case"t":this.uniforms[n].value=t[r.value]||null;break;case"c":this.uniforms[n].value=new Ne().setHex(r.value);break;case"v2":this.uniforms[n].value=new Ye().fromArray(r.value);break;case"v3":this.uniforms[n].value=new C().fromArray(r.value);break;case"v4":this.uniforms[n].value=new xt().fromArray(r.value);break;case"m3":this.uniforms[n].value=new Oe().fromArray(r.value);break;case"m4":this.uniforms[n].value=new Ve().fromArray(r.value);break;default:this.uniforms[n].value=r.value}}if(e.defines!==void 0&&(this.defines=e.defines),e.vertexShader!==void 0&&(this.vertexShader=e.vertexShader),e.fragmentShader!==void 0&&(this.fragmentShader=e.fragmentShader),e.glslVersion!==void 0&&(this.glslVersion=e.glslVersion),e.extensions!==void 0)for(const n in e.extensions)this.extensions[n]=e.extensions[n];return e.lights!==void 0&&(this.lights=e.lights),e.clipping!==void 0&&(this.clipping=e.clipping),this}}class _0 extends xi{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}}class wo extends Sn{constructor(e){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new Ne(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Ne(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=uo,this.normalScale=new Ye(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new yn,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class Tn extends wo{constructor(e){super(),this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:"",PHYSICAL:""},this.type="MeshPhysicalMaterial",this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new Ye(1,1),this.clearcoatNormalMap=null,this.diffuseRoughnessMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return nt(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(t){this.ior=(1+.4*t)/(1-.4*t)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessMinimum=100,this.iridescenceThicknessMaximum=400,this.iridescenceThicknessMap=null,this.sheenColor=new Ne(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new Ne(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new Ne(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._diffuseRoughness=0,this._dispersion=0,this._iridescence=0,this._retroreflectivity=0,this._sheen=0,this._transmission=0,this.setValues(e)}get anisotropy(){return this._anisotropy}set anisotropy(e){this._anisotropy>0!=e>0&&this.version++,this._anisotropy=e}get clearcoat(){return this._clearcoat}set clearcoat(e){this._clearcoat>0!=e>0&&this.version++,this._clearcoat=e}get diffuseRoughness(){return this._diffuseRoughness}set diffuseRoughness(e){this._diffuseRoughness>0!=e>0&&this.version++,this._diffuseRoughness=e}get iridescence(){return this._iridescence}set iridescence(e){this._iridescence>0!=e>0&&this.version++,this._iridescence=e}get dispersion(){return this._dispersion}set dispersion(e){this._dispersion>0!=e>0&&this.version++,this._dispersion=e}get retroreflectivity(){return this._retroreflectivity}set retroreflectivity(e){this._retroreflectivity>0!=e>0&&this.version++,this._retroreflectivity=e}get sheen(){return this._sheen}set sheen(e){this._sheen>0!=e>0&&this.version++,this._sheen=e}get transmission(){return this._transmission}set transmission(e){this._transmission>0!=e>0&&this.version++,this._transmission=e}get iridescenceThicknessRange(){return dr('MeshPhysicalMaterial: The "iridescenceThicknessRange" property has been replaced by "iridescenceThicknessMinimum" and "iridescenceThicknessMaximum".'),[this.iridescenceThicknessMinimum,this.iridescenceThicknessMaximum]}set iridescenceThicknessRange(e){dr('MeshPhysicalMaterial: The "iridescenceThicknessRange" property has been replaced by "iridescenceThicknessMinimum" and "iridescenceThicknessMaximum".'),this.iridescenceThicknessMinimum=e[0],this.iridescenceThicknessMaximum=e[1]}copy(e){return super.copy(e),this.defines={STANDARD:"",PHYSICAL:""},this.anisotropy=e.anisotropy,this.anisotropyRotation=e.anisotropyRotation,this.anisotropyMap=e.anisotropyMap,this.clearcoat=e.clearcoat,this.clearcoatMap=e.clearcoatMap,this.clearcoatRoughness=e.clearcoatRoughness,this.clearcoatRoughnessMap=e.clearcoatRoughnessMap,this.clearcoatNormalMap=e.clearcoatNormalMap,this.clearcoatNormalScale.copy(e.clearcoatNormalScale),this.diffuseRoughness=e.diffuseRoughness,this.diffuseRoughnessMap=e.diffuseRoughnessMap,this.dispersion=e.dispersion,this.ior=e.ior,this.iridescence=e.iridescence,this.iridescenceMap=e.iridescenceMap,this.iridescenceIOR=e.iridescenceIOR,this.iridescenceThicknessMinimum=e.iridescenceThicknessMinimum,this.iridescenceThicknessMaximum=e.iridescenceThicknessMaximum,this.iridescenceThicknessMap=e.iridescenceThicknessMap,this.retroreflectivity=e.retroreflectivity,this.sheen=e.sheen,this.sheenColor.copy(e.sheenColor),this.sheenColorMap=e.sheenColorMap,this.sheenRoughness=e.sheenRoughness,this.sheenRoughnessMap=e.sheenRoughnessMap,this.transmission=e.transmission,this.transmissionMap=e.transmissionMap,this.thickness=e.thickness,this.thicknessMap=e.thicknessMap,this.attenuationDistance=e.attenuationDistance,this.attenuationColor.copy(e.attenuationColor),this.specularIntensity=e.specularIntensity,this.specularIntensityMap=e.specularIntensityMap,this.specularColor.copy(e.specularColor),this.specularColorMap=e.specularColorMap,this}}class v0 extends Sn{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=hf,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class x0 extends Sn{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}function fi(i,e){return!i||i.constructor===e?i:typeof e.BYTES_PER_ELEMENT=="number"?new e(i):Array.prototype.slice.call(i)}function $r(i){return i!==void 0&&i.inTangents!==void 0&&i.outTangents!==void 0}function M0(i){function e(r,s){return i[r]-i[s]}const t=i.length,n=new Array(t);for(let r=0;r!==t;++r)n[r]=r;return n.sort(e),n}function Vc(i,e,t){const n=i.length,r=new i.constructor(n);for(let s=0,o=0;o!==n;++s){const a=t[s]*e;for(let l=0;l!==e;++l)r[o++]=i[a+l]}return r}function S0(i,e,t,n){let r=1,s=i[0];for(;s!==void 0&&s[n]===void 0;)s=i[r++];if(s===void 0)return;let o=s[n];if(o!==void 0)if(Array.isArray(o))do o=s[n],o!==void 0&&(e.push(s.time),t.push(...o)),s=i[r++];while(s!==void 0);else if(o.toArray!==void 0)do o=s[n],o!==void 0&&(e.push(s.time),o.toArray(t,t.length)),s=i[r++];while(s!==void 0);else do o=s[n],o!==void 0&&(e.push(s.time),t.push(o)),s=i[r++];while(s!==void 0)}class Tr{constructor(e,t,n,r){this.parameterPositions=e,this._cachedIndex=0,this.resultBuffer=r!==void 0?r:new t.constructor(n),this.sampleValues=t,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(e){const t=this.parameterPositions;let n=this._cachedIndex,r=t[n],s=t[n-1];n:{e:{let o;t:{i:if(!(e<r)){for(let a=n+2;;){if(r===void 0){if(e<s)break i;return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===a)break;if(s=r,r=t[++n],e<r)break e}o=t.length;break t}if(!(e>=s)){const a=t[1];e<a&&(n=2,s=a);for(let l=n-2;;){if(s===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===l)break;if(r=s,s=t[--n-1],e>=s)break e}o=n,n=0;break t}break n}for(;n<o;){const a=n+o>>>1;e<t[a]?o=a:n=a+1}if(r=t[n],s=t[n-1],s===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(r===void 0)return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,s,r)}return this.interpolate_(n,s,e,r)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(e){const t=this.resultBuffer,n=this.sampleValues,r=this.valueSize,s=e*r;for(let o=0;o!==r;++o)t[o]=n[s+o];return t}interpolate_(){throw new Error("THREE.Interpolant: Call to abstract method.")}intervalChanged_(){}}class y0 extends Tr{constructor(e,t,n,r){super(e,t,n,r),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:ic,endingEnd:ic}}intervalChanged_(e,t,n){const r=this.parameterPositions;let s=e-2,o=e+1,a=r[s],l=r[o];if(a===void 0)switch(this.getSettings_().endingStart){case rc:s=e,a=2*t-n;break;case sc:s=r.length-2,a=t+r[s]-r[s+1];break;default:s=e,a=n}if(l===void 0)switch(this.getSettings_().endingEnd){case rc:o=e,l=2*n-t;break;case sc:o=1,l=n+r[1]-r[0];break;default:o=e-1,l=t}const c=(n-t)*.5,u=this.valueSize;this._weightPrev=c/(t-a),this._weightNext=c/(l-n),this._offsetPrev=s*u,this._offsetNext=o*u}interpolate_(e,t,n,r){const s=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=e*a,c=l-a,u=this._offsetPrev,h=this._offsetNext,d=this._weightPrev,f=this._weightNext,g=(n-t)/(r-t),v=g*g,p=v*g,m=-d*p+2*d*v-d*g,x=(1+d)*p+(-1.5-2*d)*v+(-.5+d)*g+1,A=(-1-f)*p+(1.5+f)*v+.5*g,y=f*p-f*v;for(let b=0;b!==a;++b)s[b]=m*o[u+b]+x*o[c+b]+A*o[l+b]+y*o[h+b];return s}}class T0 extends Tr{constructor(e,t,n,r){super(e,t,n,r)}interpolate_(e,t,n,r){const s=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=e*a,c=l-a,u=(n-t)/(r-t),h=1-u;for(let d=0;d!==a;++d)s[d]=o[c+d]*h+o[l+d]*u;return s}}class E0 extends Tr{constructor(e,t,n,r){super(e,t,n,r)}interpolate_(e){return this.copySampleValue_(e-1)}}class b0 extends Tr{interpolate_(e,t,n,r){const s=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=e*a,c=l-a,u=this.inTangents,h=this.outTangents;if(!u||!h){const g=(n-t)/(r-t),v=1-g;for(let p=0;p!==a;++p)s[p]=o[c+p]*v+o[l+p]*g;return s}const d=a*2,f=e-1;for(let g=0;g!==a;++g){const v=o[c+g],p=o[l+g],m=f*d+g*2,x=h[m],A=h[m+1],y=e*d+g*2,b=u[y],E=u[y+1],_=w0(n,t,x,b,r);s[g]=Zh(_,v,A,E,p)}return s}}function Zh(i,e,t,n,r){const s=1-i;return s*s*s*e+3*s*s*i*t+3*s*i*i*n+i*i*i*r}function A0(i,e,t,n,r){const s=1-i;return 3*s*s*(t-e)+6*s*i*(n-t)+3*i*i*(r-n)}function w0(i,e,t,n,r){let s=(i-e)/(r-e);for(let o=0;o<8;o++){const a=Zh(s,e,t,n,r)-i;if(Math.abs(a)<1e-10)break;const l=A0(s,e,t,n,r);if(Math.abs(l)<1e-10)break;s=Math.max(0,Math.min(1,s-a/l))}return s}class En{constructor(e,t,n,r){if(e===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(t===void 0||t.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+e);this.name=e,this.times=fi(t,this.TimeBufferType),this.values=fi(n,this.ValueBufferType),this.setInterpolation(r||this.DefaultInterpolation)}static toJSON(e){const t=e.constructor;let n;if(t.toJSON!==this.toJSON)n=t.toJSON(e);else{n={name:e.name,times:fi(e.times,Array),values:fi(e.values,Array)};const r=e.getInterpolation();r!==e.DefaultInterpolation&&(n.interpolation=r),$r(e.settings)&&(n.settings={inTangents:fi(e.settings.inTangents,Array),outTangents:fi(e.settings.outTangents,Array)})}return n.type=e.ValueTypeName,n}InterpolantFactoryMethodDiscrete(e){return new E0(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodLinear(e){return new T0(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodSmooth(e){return new y0(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodBezier(e){const t=new b0(this.times,this.values,this.getValueSize(),e);return this.settings&&(t.inTangents=this.settings.inTangents,t.outTangents=this.settings.outTangents),t}setInterpolation(e){let t;switch(e){case as:t=this.InterpolantFactoryMethodDiscrete;break;case ls:t=this.InterpolantFactoryMethodLinear;break;case Io:t=this.InterpolantFactoryMethodSmooth;break;case nc:t=this.InterpolantFactoryMethodBezier;break}if(t===void 0){const n="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(e!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(n);return De("KeyframeTrack:",n),this}return this.createInterpolant=t,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return as;case this.InterpolantFactoryMethodLinear:return ls;case this.InterpolantFactoryMethodSmooth:return Io;case this.InterpolantFactoryMethodBezier:return nc}}getValueSize(){return this.values.length/this.times.length}shift(e){if(e!==0){const t=this.times;for(let n=0,r=t.length;n!==r;++n)t[n]+=e;$r(this.settings)&&(Hc(this.settings.inTangents,e),Hc(this.settings.outTangents,e))}return this}scale(e){if(e!==1){const t=this.times;for(let n=0,r=t.length;n!==r;++n)t[n]*=e;$r(this.settings)&&(zc(this.settings.inTangents,e),zc(this.settings.outTangents,e))}return this}trim(e,t){const n=this.times,r=n.length;let s=0,o=r-1;for(;s!==r&&n[s]<e;)++s;for(;o!==-1&&n[o]>t;)--o;if(++o,s!==0||o!==r){s>=o&&(o=Math.max(o,1),s=o-1);const a=this.getValueSize();this.times=n.slice(s,o),this.values=this.values.slice(s*a,o*a)}return this}validate(){let e=!0;const t=this.getValueSize();t-Math.floor(t)!==0&&(Xe("KeyframeTrack: Invalid value size in track.",this),e=!1);const n=this.times,r=this.values,s=n.length;s===0&&(Xe("KeyframeTrack: Track is empty.",this),e=!1);let o=null;for(let a=0;a!==s;a++){const l=n[a];if(typeof l=="number"&&isNaN(l)){Xe("KeyframeTrack: Time is not a valid number.",this,a,l),e=!1;break}if(o!==null&&o>l){Xe("KeyframeTrack: Out of order keys.",this,a,l,o),e=!1;break}o=l}if(r!==void 0&&Sf(r))for(let a=0,l=r.length;a!==l;++a){const c=r[a];if(isNaN(c)){Xe("KeyframeTrack: Value is not a valid number.",this,a,c),e=!1;break}}return e}optimize(){const e=this.times.slice(),t=this.values.slice(),n=this.getValueSize(),r=this.getInterpolation()===Io,s=e.length-1;let o=1;for(let a=1;a<s;++a){let l=!1;const c=e[a],u=e[a+1];if(c!==u&&(a!==1||c!==e[0]))if(r)l=!0;else{const h=a*n,d=h-n,f=h+n;for(let g=0;g!==n;++g){const v=t[h+g];if(v!==t[d+g]||v!==t[f+g]){l=!0;break}}}if(l){if(a!==o){e[o]=e[a];const h=a*n,d=o*n;for(let f=0;f!==n;++f)t[d+f]=t[h+f]}++o}}if(s>0){e[o]=e[s];for(let a=s*n,l=o*n,c=0;c!==n;++c)t[l+c]=t[a+c];++o}return o!==e.length?(this.times=e.slice(0,o),this.values=t.slice(0,o*n)):(this.times=e,this.values=t),this}clone(){const e=this.times.slice(),t=this.values.slice(),n=this.constructor,r=new n(this.name,e,t);return r.createInterpolant=this.createInterpolant,$r(this.settings)&&(r.settings={inTangents:this.settings.inTangents.slice(),outTangents:this.settings.outTangents.slice()}),r}}function Hc(i,e){for(let t=0,n=i.length;t!==n;t+=2)i[t]+=e}function zc(i,e){for(let t=0,n=i.length;t!==n;t+=2)i[t]*=e}En.prototype.ValueTypeName="";En.prototype.TimeBufferType=Float32Array;En.prototype.ValueBufferType=Float32Array;En.prototype.DefaultInterpolation=ls;class Er extends En{constructor(e,t,n){super(e,t,n)}}Er.prototype.ValueTypeName="bool";Er.prototype.ValueBufferType=Array;Er.prototype.DefaultInterpolation=as;Er.prototype.InterpolantFactoryMethodLinear=void 0;Er.prototype.InterpolantFactoryMethodSmooth=void 0;class Jh extends En{constructor(e,t,n,r){super(e,t,n,r)}}Jh.prototype.ValueTypeName="color";class ds extends En{constructor(e,t,n,r){super(e,t,n,r)}}ds.prototype.ValueTypeName="number";class R0 extends Tr{constructor(e,t,n,r){super(e,t,n,r)}interpolate_(e,t,n,r){const s=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=(n-t)/(r-t);let c=e*a;for(let u=c+a;c!==u;c+=4)Fe.slerpFlat(s,0,o,c-a,o,c,l);return s}}class fs extends En{constructor(e,t,n,r){super(e,t,n,r)}InterpolantFactoryMethodLinear(e){return new R0(this.times,this.values,this.getValueSize(),e)}}fs.prototype.ValueTypeName="quaternion";fs.prototype.InterpolantFactoryMethodSmooth=void 0;class br extends En{constructor(e,t,n){super(e,t,n)}}br.prototype.ValueTypeName="string";br.prototype.ValueBufferType=Array;br.prototype.DefaultInterpolation=as;br.prototype.InterpolantFactoryMethodLinear=void 0;br.prototype.InterpolantFactoryMethodSmooth=void 0;class _o extends En{constructor(e,t,n,r){super(e,t,n,r)}}_o.prototype.ValueTypeName="vector";class C0{constructor(e="",t=-1,n=[],r=cf){this.name=e,this.tracks=n,this.duration=t,this.blendMode=r,this.uuid=kn(),this.userData={},this.duration<0&&this.resetDuration()}static parse(e){const t=[],n=e.tracks,r=1/(e.fps||1);for(let o=0,a=n.length;o!==a;++o)t.push(L0(n[o]).scale(r));const s=new this(e.name,e.duration,t,e.blendMode);return s.uuid=e.uuid,s.userData=JSON.parse(e.userData||"{}"),s}static toJSON(e){const t=[],n=e.tracks,r={name:e.name,duration:e.duration,tracks:t,uuid:e.uuid,blendMode:e.blendMode,userData:JSON.stringify(e.userData)};for(let s=0,o=n.length;s!==o;++s)t.push(En.toJSON(n[s]));return r}static CreateFromMorphTargetSequence(e,t,n,r){const s=t.length,o=[];for(let a=0;a<s;a++){let l=[],c=[];l.push((a+s-1)%s,a,(a+1)%s),c.push(0,1,0);const u=M0(l);l=Vc(l,1,u),c=Vc(c,1,u),!r&&l[0]===0&&(l.push(s),c.push(c[0])),o.push(new ds(".morphTargetInfluences["+t[a].name+"]",l,c).scale(1/n))}return new this(e,-1,o)}static findByName(e,t){let n=e;if(!Array.isArray(e)){const r=e;n=r.geometry&&r.geometry.animations||r.animations}for(let r=0;r<n.length;r++)if(n[r].name===t)return n[r];return null}static CreateClipsFromMorphTargetSequences(e,t,n){const r={},s=/^([\w-]*?)([\d]+)$/;for(let a=0,l=e.length;a<l;a++){const c=e[a],u=c.name.match(s);if(u&&u.length>1){const h=u[1];let d=r[h];d||(r[h]=d=[]),d.push(c)}}const o=[];for(const a in r)o.push(this.CreateFromMorphTargetSequence(a,r[a],t,n));return o}resetDuration(){const e=this.tracks;let t=0;for(let n=0,r=e.length;n!==r;++n){const s=this.tracks[n];t=Math.max(t,s.times[s.times.length-1])}return this.duration=t,this}trim(){for(let e=0;e<this.tracks.length;e++)this.tracks[e].trim(0,this.duration);return this}validate(){let e=!0;for(let t=0;t<this.tracks.length;t++)e=e&&this.tracks[t].validate();return e}optimize(){for(let e=0;e<this.tracks.length;e++)this.tracks[e].optimize();return this}clone(){const e=[];for(let n=0;n<this.tracks.length;n++)e.push(this.tracks[n].clone());const t=new this.constructor(this.name,this.duration,e,this.blendMode);return t.userData=JSON.parse(JSON.stringify(this.userData)),t}toJSON(){return this.constructor.toJSON(this)}}function P0(i){switch(i.toLowerCase()){case"scalar":case"double":case"float":case"number":case"integer":return ds;case"vector":case"vector2":case"vector3":case"vector4":return _o;case"color":return Jh;case"quaternion":return fs;case"bool":case"boolean":return Er;case"string":return br}throw new Error("THREE.KeyframeTrack: Unsupported typeName: "+i)}function L0(i){if(i.type===void 0)throw new Error("THREE.KeyframeTrack: track type undefined, can not parse");const e=P0(i.type);if(i.times===void 0){const n=[],r=[];S0(i.keys,n,r,"value"),i.times=n,i.values=r}let t;return e.parse!==void 0?t=e.parse(i):t=new e(i.name,i.times,i.values,i.interpolation),$r(i.settings)&&(t.settings={inTangents:fi(i.settings.inTangents,Float32Array),outTangents:fi(i.settings.outTangents,Float32Array)}),t}const Qn={enabled:!1,files:{},add:function(i,e){this.enabled!==!1&&(Gc(i)||(this.files[i]=e))},get:function(i){if(this.enabled!==!1&&!Gc(i))return this.files[i]},remove:function(i){delete this.files[i]},clear:function(){this.files={}}};function Gc(i){try{const e=i.slice(i.indexOf(":")+1);return new URL(e).protocol==="blob:"}catch{return!1}}class I0{constructor(e,t,n){const r=this;let s=!1,o=0,a=0,l;const c=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=n,this._abortController=null,this.itemStart=function(u){a++,s===!1&&r.onStart!==void 0&&r.onStart(u,o,a),s=!0},this.itemEnd=function(u){o++,r.onProgress!==void 0&&r.onProgress(u,o,a),o===a&&(s=!1,r.onLoad!==void 0&&r.onLoad())},this.itemError=function(u){r.onError!==void 0&&r.onError(u)},this.resolveURL=function(u){return u=u.normalize("NFC"),l?l(u):u},this.setURLModifier=function(u){return l=u,this},this.addHandler=function(u,h){return c.push(u,h),this},this.removeHandler=function(u){const h=c.indexOf(u);return h!==-1&&c.splice(h,2),this},this.getHandler=function(u){for(let h=0,d=c.length;h<d;h+=2){const f=c[h],g=c[h+1];if(f.global&&(f.lastIndex=0),f.test(u))return g}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}}const N0=new I0;class Ar{constructor(e){this.manager=e!==void 0?e:N0,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},this.priority="auto",this.cache="default",typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(e,t){const n=this;return new Promise(function(r,s){n.load(e,r,t,s)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}setPriority(e){return this.priority=e,this}setCache(e){return this.cache=e,this}abort(){return this}}Ar.DEFAULT_MATERIAL_NAME="__DEFAULT";const Zn={};class D0 extends Error{constructor(e,t){super(e),this.response=t}}class Qh extends Ar{constructor(e){super(e),this.mimeType="",this.responseType="",this._abortController=new AbortController}load(e,t,n,r){e===void 0&&(e=""),this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const s=Qn.get(`file:${e}`);if(s!==void 0){this.manager.itemStart(e),setTimeout(()=>{t&&t(s),this.manager.itemEnd(e)},0);return}if(Zn[e]!==void 0){Zn[e].push({onLoad:t,onProgress:n,onError:r});return}Zn[e]=[],Zn[e].push({onLoad:t,onProgress:n,onError:r});const o=new Request(e,{headers:new Headers(this.requestHeader),credentials:this.withCredentials?"include":"same-origin",priority:this.priority,cache:this.cache,signal:typeof AbortSignal.any=="function"?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal}),a=this.mimeType,l=this.responseType;fetch(o).then(c=>{if(c.status===200||c.status===0){if(c.status===0&&De("FileLoader: HTTP Status 0 received."),typeof ReadableStream>"u"||c.body===void 0||c.body.getReader===void 0)return c;const u=Zn[e],h=c.body.getReader(),d=c.headers.get("X-File-Size")||c.headers.get("Content-Length"),f=d?parseInt(d):0,g=f!==0;let v=0;const p=new ReadableStream({start(m){x();function x(){h.read().then(({done:A,value:y})=>{if(A)m.close();else{v+=y.byteLength;const b=new ProgressEvent("progress",{lengthComputable:g,loaded:v,total:f});for(let E=0,_=u.length;E<_;E++){const S=u[E];S.onProgress&&S.onProgress(b)}m.enqueue(y),x()}},A=>{m.error(A)})}}});return new Response(p)}else throw new D0(`fetch for "${c.url}" responded with ${c.status}: ${c.statusText}`,c)}).then(c=>{switch(l){case"arraybuffer":return c.arrayBuffer();case"blob":return c.blob();case"document":return c.text().then(u=>new DOMParser().parseFromString(u,a));case"json":return c.json();default:if(a==="")return c.text();{const h=/charset="?([^;"\s]*)"?/i.exec(a),d=h&&h[1]?h[1].toLowerCase():void 0,f=new TextDecoder(d);return c.arrayBuffer().then(g=>f.decode(g))}}}).then(c=>{Qn.add(`file:${e}`,c);const u=Zn[e];delete Zn[e];for(let h=0,d=u.length;h<d;h++){const f=u[h];f.onLoad&&f.onLoad(c)}}).catch(c=>{const u=Zn[e];if(u===void 0)throw this.manager.itemError(e),c;delete Zn[e];for(let h=0,d=u.length;h<d;h++){const f=u[h];f.onError&&f.onError(c)}this.manager.itemError(e)}).finally(()=>{this.manager.itemEnd(e)}),this.manager.itemStart(e)}setResponseType(e){return this.responseType=e,this}setMimeType(e){return this.mimeType=e,this}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}}const er=new WeakMap;class jh extends Ar{constructor(e){super(e)}load(e,t,n,r){this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const s=this,o=Qn.get(`image:${e}`);if(o!==void 0){if(o.complete===!0)s.manager.itemStart(e),setTimeout(function(){t&&t(o),s.manager.itemEnd(e)},0);else{let h=er.get(o);h===void 0&&(h=[],er.set(o,h)),h.push({onLoad:t,onError:r})}return o}const a=us("img");function l(){u(),t&&t(this);const h=er.get(this)||[];for(let d=0;d<h.length;d++){const f=h[d];f.onLoad&&f.onLoad(this)}er.delete(this),s.manager.itemEnd(e)}function c(h){u(),r&&r(h),Qn.remove(`image:${e}`);const d=er.get(this)||[];for(let f=0;f<d.length;f++){const g=d[f];g.onError&&g.onError(h)}er.delete(this),s.manager.itemError(e),s.manager.itemEnd(e)}function u(){a.removeEventListener("load",l,!1),a.removeEventListener("error",c,!1)}return a.addEventListener("load",l,!1),a.addEventListener("error",c,!1),e.slice(0,5)!=="data:"&&this.crossOrigin!==void 0&&(a.crossOrigin=this.crossOrigin),Qn.add(`image:${e}`,a),s.manager.itemStart(e),a.fetchPriority=this.priority,a.src=e,a}}class U0 extends Ar{constructor(e){super(e)}load(e,t,n,r){const s=new Lt,o=new jh(this.manager);return o.setPriority(this.priority),o.setCache(this.cache),o.setCrossOrigin(this.crossOrigin),o.setPath(this.path),o.load(e,function(a){s.image=a,s.needsUpdate=!0,t!==void 0&&t(s)},n,r),s}}class _s extends ft{static registerNode(e){this.prototype._lightNode=e}constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new Ne(e),this.intensity=t}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){const t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,t}}class O0 extends _s{constructor(e,t,n){super(e,n),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(ft.DEFAULT_UP),this.updateMatrix(),this.groundColor=new Ne(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}toJSON(e){const t=super.toJSON(e);return t.object.groundColor=this.groundColor.getHex(),t}}const ia=new Ve,Wc=new C,Xc=new C;class Fl{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new Ye(512,512),this.mapType=en,this.map=null,this.mapPass=null,this.matrix=new Ve,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new hs,this._frameExtents=new Ye(1,1),this._viewportCount=1,this._viewports=[new xt(0,0,1,1)]}getViewportCount(){return this._viewportCount}getCamera(){return this.camera}getFrustum(){return this._frustum}updateMatrices(e){const t=this.camera;Wc.setFromMatrixPosition(e.matrixWorld),t.position.copy(Wc),Xc.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(Xc),t.updateMatrixWorld(),this._updateMatrix(t,this.matrix,this._frustum)}_updateMatrix(e,t,n,r){ia.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),n.setFromProjectionMatrix(ia,e.coordinateSystem,e.reversedDepth);const s=this._frameExtents,o=r?r.z/s.x:1,a=r?r.w/s.y:1,l=r?r.x/s.x:0,c=r?r.y/s.y:0;e.coordinateSystem===cs||e.reversedDepth?t.set(.5*o,0,0,.5*o+l,0,.5*a,0,.5*a+c,0,0,1,0,0,0,0,1):t.set(.5*o,0,0,.5*o+l,0,.5*a,0,.5*a+c,0,0,.5,.5,0,0,0,1),t.multiply(ia)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this.mapType=e.mapType,this.biasNode=e.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){const e={};return e.intensity=this.intensity,e.bias=this.bias,e.normalBias=this.normalBias,e.radius=this.radius,e.blurSamples=this.blurSamples,e.mapSize=this.mapSize.toArray(),e.mapType=this.mapType,e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}}const Ws=new C,Xs=new Fe,wn=new C;class ed extends ft{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new Ve,this.projectionMatrix=new Ve,this.projectionMatrixInverse=new Ve,this.coordinateSystem=Mn,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorld.decompose(Ws,Xs,wn),wn.x===1&&wn.y===1&&wn.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Ws,Xs,wn.set(1,1,1)).invert()}updateWorldMatrix(e,t,n=!1){super.updateWorldMatrix(e,t,n),this.matrixWorld.decompose(Ws,Xs,wn),wn.x===1&&wn.y===1&&wn.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Ws,Xs,wn.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}}const ci=new C,qc=new Ye,Yc=new Ye;class Kt extends ed{constructor(e=50,t=1,n=.1,r=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=n,this.far=r,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=vr*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(ts*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return vr*2*Math.atan(Math.tan(ts*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){ci.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(ci.x,ci.y).multiplyScalar(-e/ci.z),ci.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(ci.x,ci.y).multiplyScalar(-e/ci.z)}getViewSize(e,t){return this.getViewBounds(e,qc,Yc),t.subVectors(Yc,qc)}setViewOffset(e,t,n,r,s,o){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=r,this.view.width=s,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(ts*.5*this.fov)/this.zoom,n=2*t,r=this.aspect*n,s=-.5*r;const o=this.view;if(this.view!==null&&this.view.enabled){const l=o.fullWidth,c=o.fullHeight;s+=o.offsetX*r/l,t-=o.offsetY*n/c,r*=o.width/l,n*=o.height/c}const a=this.filmOffset;a!==0&&(s+=e*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(s,s+r,t,t-n,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}class F0 extends Fl{constructor(){super(new Kt(50,1,.5,500)),this.isSpotLightShadow=!0,this.focus=1,this.aspect=1}updateMatrices(e){const t=this.camera,n=vr*2*e.angle*this.focus,r=this.mapSize.width/this.mapSize.height*this.aspect,s=e.distance||t.far;(n!==t.fov||r!==t.aspect||s!==t.far)&&(t.fov=n,t.aspect=r,t.far=s,t.updateProjectionMatrix()),super.updateMatrices(e)}copy(e){return super.copy(e),this.focus=e.focus,this.aspect=e.aspect,this}toJSON(){const e=super.toJSON();return e.focus=this.focus,e.aspect=this.aspect,e}}class B0 extends _s{constructor(e,t,n=0,r=Math.PI/3,s=0,o=2){super(e,t),this.isSpotLight=!0,this.type="SpotLight",this.position.copy(ft.DEFAULT_UP),this.updateMatrix(),this.target=new ft,this.distance=n,this.angle=r,this.penumbra=s,this.decay=o,this.map=null,this.shadow=new F0}get power(){return this.intensity*Math.PI}set power(e){this.intensity=e/Math.PI}dispose(){super.dispose(),this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.angle=e.angle,this.penumbra=e.penumbra,this.decay=e.decay,this.target=e.target.clone(),this.map=e.map,this.shadow=e.shadow.clone(),this}toJSON(e){const t=super.toJSON(e);return t.object.distance=this.distance,t.object.angle=this.angle,t.object.decay=this.decay,t.object.penumbra=this.penumbra,t.object.target=this.target.uuid,this.map&&this.map.isTexture&&(t.object.map=this.map.toJSON(e).uuid),t.object.shadow=this.shadow.toJSON(),t}}class k0 extends Fl{constructor(){super(new Kt(90,1,.5,500)),this.isPointLightShadow=!0}}class V0 extends _s{constructor(e,t,n=0,r=2){super(e,t),this.isPointLight=!0,this.type="PointLight",this.distance=n,this.decay=r,this.shadow=new k0}get power(){return this.intensity*4*Math.PI}set power(e){this.intensity=e/(4*Math.PI)}dispose(){super.dispose(),this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.decay=e.decay,this.shadow=e.shadow.clone(),this}toJSON(e){const t=super.toJSON(e);return t.object.distance=this.distance,t.object.decay=this.decay,t.object.shadow=this.shadow.toJSON(),t}}class Bl extends ed{constructor(e=-1,t=1,n=1,r=-1,s=.1,o=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=r,this.near=s,this.far=o,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,r,s,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=r,this.view.width=s,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,r=(this.top+this.bottom)/2;let s=n-e,o=n+e,a=r+t,l=r-t;if(this.view!==null&&this.view.enabled){const c=(this.right-this.left)/this.view.fullWidth/this.zoom,u=(this.top-this.bottom)/this.view.fullHeight/this.zoom;s+=c*this.view.offsetX,o=s+c*this.view.width,a-=u*this.view.offsetY,l=a-u*this.view.height}this.projectionMatrix.makeOrthographic(s,o,a,l,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}class H0 extends Fl{constructor(){super(new Bl(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class cl extends _s{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(ft.DEFAULT_UP),this.updateMatrix(),this.target=new ft,this.shadow=new H0}dispose(){super.dispose(),this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}toJSON(e){const t=super.toJSON(e);return t.object.shadow=this.shadow.toJSON(),t.object.target=this.target.uuid,t}}class z0 extends _s{constructor(e,t){super(e,t),this.isAmbientLight=!0,this.type="AmbientLight"}}class is{static extractUrlBase(e){const t=e.lastIndexOf("/");return t===-1?"./":e.slice(0,t+1)}static resolveURL(e,t){return typeof e!="string"||e===""?"":(/^https?:\/\//i.test(t)&&/^\//.test(e)&&(t=t.replace(/(^https?:\/\/[^\/]+).*/i,"$1")),/^(https?:)?\/\//i.test(e)||/^data:.*,.*$/i.test(e)||/^blob:.*$/i.test(e)?e:t+e)}}const ra=new WeakMap;class G0 extends Ar{constructor(e){super(e),this.isImageBitmapLoader=!0,typeof createImageBitmap>"u"&&De("ImageBitmapLoader: createImageBitmap() not supported."),typeof fetch>"u"&&De("ImageBitmapLoader: fetch() not supported."),this.options={premultiplyAlpha:"none"},this._abortController=new AbortController}setOptions(e){return this.options=e,this}load(e,t,n,r){e===void 0&&(e=""),this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const s=this,o=Qn.get(`image-bitmap:${e}`);if(o!==void 0){if(s.manager.itemStart(e),o.then){o.then(c=>{ra.has(o)===!0?(r&&r(ra.get(o)),s.manager.itemError(e),s.manager.itemEnd(e)):(t&&t(c),s.manager.itemEnd(e))});return}setTimeout(function(){t&&t(o),s.manager.itemEnd(e)},0);return}const a={};a.credentials=this.withCredentials||this.crossOrigin!=="anonymous"?"include":"same-origin",a.headers=this.requestHeader,a.priority=this.priority,a.cache=this.cache,a.signal=typeof AbortSignal.any=="function"?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal;const l=fetch(e,a).then(function(c){return c.blob()}).then(function(c){return createImageBitmap(c,Object.assign({},s.options,{colorSpaceConversion:"none"}))}).then(function(c){return Qn.add(`image-bitmap:${e}`,c),t&&t(c),s.manager.itemEnd(e),c}).catch(function(c){r&&r(c),ra.set(l,c),Qn.remove(`image-bitmap:${e}`),s.manager.itemError(e),s.manager.itemEnd(e)});Qn.add(`image-bitmap:${e}`,l),s.manager.itemStart(e)}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}}const tr=-90,nr=1;class ul extends ft{constructor(e,t,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;const r=new Kt(tr,nr,e,t);r.layers=this.layers,this.add(r);const s=new Kt(tr,nr,e,t);s.layers=this.layers,this.add(s);const o=new Kt(tr,nr,e,t);o.layers=this.layers,this.add(o);const a=new Kt(tr,nr,e,t);a.layers=this.layers,this.add(a);const l=new Kt(tr,nr,e,t);l.layers=this.layers,this.add(l);const c=new Kt(tr,nr,e,t);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[n,r,s,o,a,l]=t;for(const c of t)this.remove(c);if(e===Mn)n.up.set(0,1,0),n.lookAt(1,0,0),r.up.set(0,1,0),r.lookAt(-1,0,0),s.up.set(0,0,-1),s.lookAt(0,1,0),o.up.set(0,0,1),o.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(e===cs)n.up.set(0,-1,0),n.lookAt(-1,0,0),r.up.set(0,-1,0),r.lookAt(1,0,0),s.up.set(0,0,1),s.lookAt(0,1,0),o.up.set(0,0,-1),o.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const c of t)this.add(c),c.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:n,activeMipmapLevel:r}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[s,o,a,l,c,u]=this.children,h=e.getRenderTarget(),d=e.getActiveCubeFace(),f=e.getActiveMipmapLevel(),g=e.xr.enabled;e.xr.enabled=!1;const v=n.texture.mipmapsAutoUpdate;n.texture.mipmapsAutoUpdate=!1;let p=!1;e.isWebGLRenderer===!0?p=e.state.buffers.depth.getReversed():p=e.reversedDepthBuffer,e.setRenderTarget(n,0,r),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,s),e.setRenderTarget(n,1,r),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,o),e.setRenderTarget(n,2,r),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,a),e.setRenderTarget(n,3,r),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,l),e.setRenderTarget(n,4,r),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,c),n.texture.mipmapsAutoUpdate=v,e.setRenderTarget(n,5,r),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,u),e.setRenderTarget(h,d,f),e.xr.enabled=g,n.texture.needsPMREMUpdate=!0}}class W0 extends Kt{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e,this.perCameraFrustumCulled=!1}}const kl="\\[\\]\\.:\\/",X0=new RegExp("["+kl+"]","g"),Vl="[^"+kl+"]",q0="[^"+kl.replace("\\.","")+"]",Y0=/((?:WC+[\/:])*)/.source.replace("WC",Vl),K0=/(WCOD+)?/.source.replace("WCOD",q0),$0=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",Vl),Z0=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",Vl),J0=new RegExp("^"+Y0+K0+$0+Z0+"$"),Q0=["material","materials","bones","map"];class j0{constructor(e,t,n){const r=n||_t.parseTrackName(t);this._targetGroup=e,this._bindings=e.subscribe_(t,r)}getValue(e,t){this.bind();const n=this._targetGroup.nCachedObjects_,r=this._bindings[n];r!==void 0&&r.getValue(e,t)}setValue(e,t){const n=this._bindings;for(let r=this._targetGroup.nCachedObjects_,s=n.length;r!==s;++r)n[r].setValue(e,t)}bind(){const e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].bind()}unbind(){const e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].unbind()}}class _t{constructor(e,t,n){this.path=t,this.parsedPath=n||_t.parseTrackName(t),this.node=_t.findNode(e,this.parsedPath.nodeName),this.rootNode=e,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(e,t,n){return e&&e.isAnimationObjectGroup?new _t.Composite(e,t,n):new _t(e,t,n)}static sanitizeNodeName(e){return e.replace(/\s/g,"_").replace(X0,"")}static parseTrackName(e){const t=J0.exec(e);if(t===null)throw new Error("THREE.PropertyBinding: Cannot parse trackName: "+e);const n={nodeName:t[2],objectName:t[3],objectIndex:t[4],propertyName:t[5],propertyIndex:t[6]},r=n.nodeName&&n.nodeName.lastIndexOf(".");if(r!==void 0&&r!==-1){const s=n.nodeName.substring(r+1);Q0.indexOf(s)!==-1&&(n.nodeName=n.nodeName.substring(0,r),n.objectName=s)}if(n.propertyName===null||n.propertyName.length===0)throw new Error("THREE.PropertyBinding: can not parse propertyName from trackName: "+e);return n}static findNode(e,t){if(t===void 0||t===""||t==="."||t===-1||t===e.name||t===e.uuid)return e;if(e.skeleton){const n=e.skeleton.getBoneByName(t);if(n!==void 0)return n}if(e.children){const n=function(s){for(let o=0;o<s.length;o++){const a=s[o];if(a.name===t||a.uuid===t)return a;const l=n(a.children);if(l)return l}return null},r=n(e.children);if(r)return r}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(e,t){e[t]=this.targetObject[this.propertyName]}_getValue_array(e,t){const n=this.resolvedProperty;for(let r=0,s=n.length;r!==s;++r)e[t++]=n[r]}_getValue_arrayElement(e,t){e[t]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(e,t){this.resolvedProperty.toArray(e,t)}_setValue_direct(e,t){this.targetObject[this.propertyName]=e[t]}_setValue_direct_setNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(e,t){const n=this.resolvedProperty;for(let r=0,s=n.length;r!==s;++r)n[r]=e[t++]}_setValue_array_setNeedsUpdate(e,t){const n=this.resolvedProperty;for(let r=0,s=n.length;r!==s;++r)n[r]=e[t++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(e,t){const n=this.resolvedProperty;for(let r=0,s=n.length;r!==s;++r)n[r]=e[t++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(e,t){this.resolvedProperty[this.propertyIndex]=e[t]}_setValue_arrayElement_setNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(e,t){this.resolvedProperty.fromArray(e,t)}_setValue_fromArray_setNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(e,t){this.bind(),this.getValue(e,t)}_setValue_unbound(e,t){this.bind(),this.setValue(e,t)}bind(){let e=this.node;const t=this.parsedPath,n=t.objectName,r=t.propertyName;let s=t.propertyIndex;if(e||(e=_t.findNode(this.rootNode,t.nodeName),this.node=e),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!e){De("PropertyBinding: No target node found for track: "+this.path+".");return}if(n){let c=t.objectIndex;switch(n){case"materials":if(!e.material){Xe("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.materials){Xe("PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}e=e.material.materials;break;case"bones":if(!e.skeleton){Xe("PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}e=e.skeleton.bones;for(let u=0;u<e.length;u++)if(e[u].name===c){c=u;break}break;case"map":if("map"in e){e=e.map;break}if(!e.material){Xe("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.map){Xe("PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}e=e.material.map;break;default:if(e[n]===void 0){Xe("PropertyBinding: Can not bind to objectName of node undefined.",this);return}e=e[n]}if(c!==void 0){if(e[c]===void 0){Xe("PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,e);return}e=e[c]}}const o=e[r];if(o===void 0){const c=t.nodeName;Xe("PropertyBinding: Trying to update property for track: "+c+"."+r+" but it wasn't found.",e);return}let a=this.Versioning.None;this.targetObject=e,e.isMaterial===!0?a=this.Versioning.NeedsUpdate:e.isObject3D===!0&&(a=this.Versioning.MatrixWorldNeedsUpdate);let l=this.BindingType.Direct;if(s!==void 0){if(r==="morphTargetInfluences"){if(!e.geometry){Xe("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!e.geometry.morphAttributes){Xe("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}e.morphTargetDictionary[s]!==void 0&&(s=e.morphTargetDictionary[s])}l=this.BindingType.ArrayElement,this.resolvedProperty=o,this.propertyIndex=s}else o.fromArray!==void 0&&o.toArray!==void 0?(l=this.BindingType.HasFromToArray,this.resolvedProperty=o):Array.isArray(o)?(l=this.BindingType.EntireArray,this.resolvedProperty=o):this.propertyName=r;this.getValue=this.GetterByBindingType[l],this.setValue=this.SetterByBindingTypeAndVersioning[l][a]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}}_t.Composite=j0;_t.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};_t.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};_t.prototype.GetterByBindingType=[_t.prototype._getValue_direct,_t.prototype._getValue_array,_t.prototype._getValue_arrayElement,_t.prototype._getValue_toArray];_t.prototype.SetterByBindingTypeAndVersioning=[[_t.prototype._setValue_direct,_t.prototype._setValue_direct_setNeedsUpdate,_t.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[_t.prototype._setValue_array,_t.prototype._setValue_array_setNeedsUpdate,_t.prototype._setValue_array_setMatrixWorldNeedsUpdate],[_t.prototype._setValue_arrayElement,_t.prototype._setValue_arrayElement_setNeedsUpdate,_t.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[_t.prototype._setValue_fromArray,_t.prototype._setValue_fromArray_setNeedsUpdate,_t.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];class Kc{constructor(e,t,n,r,s,o=!1){this.isGLBufferAttribute=!0,this.name="",this.buffer=e,this.type=t,this.itemSize=n,this.elementSize=r,this.count=s,this.normalized=o,this.version=0}set needsUpdate(e){e===!0&&this.version++}setBuffer(e){return this.buffer=e,this}setType(e,t){return this.type=e,this.elementSize=t,this}setItemSize(e){return this.itemSize=e,this}setCount(e){return this.count=e,this}}class ep extends gs{constructor(e=1){const t=[0,0,0,e,0,0,0,0,0,0,e,0,0,0,0,0,0,e],n=[1,0,0,1,.6,0,0,1,0,.6,1,0,0,0,1,0,.6,1],r=new Et;r.setAttribute("position",new Nt(t,3)),r.setAttribute("color",new Nt(n,3));const s=new Bi({vertexColors:!0,toneMapped:!1});super(r,s),this.type="AxesHelper"}setColors(e,t,n){const r=new Ne,s=this.geometry.attributes.color.array;return r.set(e),r.toArray(s,0),r.toArray(s,3),r.set(t),r.toArray(s,6),r.toArray(s,9),r.set(n),r.toArray(s,12),r.toArray(s,15),this.geometry.attributes.color.needsUpdate=!0,this}dispose(){super.dispose(),this.geometry.dispose(),this.material.dispose()}}function $c(i,e,t,n){const r=tp(n);switch(t){case Rh:return i*e;case El:return i*e/r.components*r.byteLength;case bl:return i*e/r.components*r.byteLength;case Oi:return i*e*2/r.components*r.byteLength;case Al:return i*e*2/r.components*r.byteLength;case Ch:return i*e*3/r.components*r.byteLength;case xn:return i*e*4/r.components*r.byteLength;case wl:return i*e*4/r.components*r.byteLength;case js:case eo:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case to:case no:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case Ia:case Da:return Math.max(i,16)*Math.max(e,8)/4;case La:case Na:return Math.max(i,8)*Math.max(e,8)/2;case Ua:case Oa:case Ba:case ka:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case Fa:case lo:case Va:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case Ha:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case za:return Math.floor((i+4)/5)*Math.floor((e+3)/4)*16;case Ga:return Math.floor((i+4)/5)*Math.floor((e+4)/5)*16;case Wa:return Math.floor((i+5)/6)*Math.floor((e+4)/5)*16;case Xa:return Math.floor((i+5)/6)*Math.floor((e+5)/6)*16;case qa:return Math.floor((i+7)/8)*Math.floor((e+4)/5)*16;case Ya:return Math.floor((i+7)/8)*Math.floor((e+5)/6)*16;case Ka:return Math.floor((i+7)/8)*Math.floor((e+7)/8)*16;case $a:return Math.floor((i+9)/10)*Math.floor((e+4)/5)*16;case Za:return Math.floor((i+9)/10)*Math.floor((e+5)/6)*16;case Ja:return Math.floor((i+9)/10)*Math.floor((e+7)/8)*16;case Qa:return Math.floor((i+9)/10)*Math.floor((e+9)/10)*16;case ja:return Math.floor((i+11)/12)*Math.floor((e+9)/10)*16;case el:return Math.floor((i+11)/12)*Math.floor((e+11)/12)*16;case tl:case nl:case il:return Math.ceil(i/4)*Math.ceil(e/4)*16;case rl:case sl:return Math.ceil(i/4)*Math.ceil(e/4)*8;case co:case ol:return Math.ceil(i/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function tp(i){switch(i){case en:case Eh:return{byteLength:1,components:1};case os:case bh:case Bn:return{byteLength:2,components:1};case yl:case Tl:return{byteLength:2,components:4};case Fn:case Sl:case ln:return{byteLength:4,components:1};case Ah:case wh:return{byteLength:4,components:3}}throw new Error(`THREE.TextureUtils: Unknown texture type ${i}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:Ui}}));typeof window<"u"&&(window.__THREE__?De("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=Ui);function td(){let i=null,e=!1,t=null,n=null;function r(s,o){n=i.requestAnimationFrame(r),t(s,o)}return{start:function(){e!==!0&&t!==null&&i!==null&&(n=i.requestAnimationFrame(r),e=!0)},stop:function(){i!==null&&i.cancelAnimationFrame(n),e=!1},setAnimationLoop:function(s){t=s},setContext:function(s){i=s}}}function np(i){const e=new WeakMap;function t(a,l){const c=a.array,u=a.usage,h=c.byteLength,d=i.createBuffer();i.bindBuffer(l,d),i.bufferData(l,c,u),a.onUploadCallback();let f;if(c instanceof Float32Array)f=i.FLOAT;else if(typeof Float16Array<"u"&&c instanceof Float16Array)f=i.HALF_FLOAT;else if(c instanceof Uint16Array)a.isFloat16BufferAttribute?f=i.HALF_FLOAT:f=i.UNSIGNED_SHORT;else if(c instanceof Int16Array)f=i.SHORT;else if(c instanceof Uint32Array)f=i.UNSIGNED_INT;else if(c instanceof Int32Array)f=i.INT;else if(c instanceof Int8Array)f=i.BYTE;else if(c instanceof Uint8Array)f=i.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)f=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:d,type:f,bytesPerElement:c.BYTES_PER_ELEMENT,version:a.version,size:h}}function n(a,l,c){const u=l.array,h=l.updateRanges;if(i.bindBuffer(c,a),h.length===0)i.bufferSubData(c,0,u);else{h.sort((f,g)=>f.start-g.start);let d=0;for(let f=1;f<h.length;f++){const g=h[d],v=h[f];v.start<=g.start+g.count+1?g.count=Math.max(g.count,v.start+v.count-g.start):(++d,h[d]=v)}h.length=d+1;for(let f=0,g=h.length;f<g;f++){const v=h[f];i.bufferSubData(c,v.start*u.BYTES_PER_ELEMENT,u,v.start,v.count)}l.clearUpdateRanges()}l.onUploadCallback()}function r(a){return a.isInterleavedBufferAttribute&&(a=a.data),e.get(a)}function s(a){a.isInterleavedBufferAttribute&&(a=a.data);const l=e.get(a);l&&(i.deleteBuffer(l.buffer),e.delete(a))}function o(a,l){if(a.isInterleavedBufferAttribute&&(a=a.data),a.isGLBufferAttribute){const u=e.get(a);(!u||u.version<a.version)&&e.set(a,{buffer:a.buffer,type:a.type,bytesPerElement:a.elementSize,version:a.version});return}const c=e.get(a);if(c===void 0)e.set(a,t(a,l));else if(c.version<a.version){if(c.size!==a.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(c.buffer,a,l),c.version=a.version}}return{get:r,remove:s,update:o}}var ip=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,rp=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,sp=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,op=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,ap=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,lp=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,cp=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,up=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,hp=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,dp=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,fp=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,pp=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,mp=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,gp=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,_p=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,vp=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,xp=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Mp=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Sp=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,yp=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,Tp=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,Ep=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,bp=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,Ap=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
#define inverseTransformDirection transformDirectionByInverseViewMatrix
vec3 transformNormalByInverseViewMatrix( in vec3 normal, in mat4 viewMatrix ) {
	return normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
}
vec3 transformDirectionByInverseViewMatrix( in vec3 dir, in mat4 viewMatrix ) {
	return normalize( ( vec4( dir, 0.0 ) * viewMatrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,wp=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
#endif`,Rp=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Cp=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,Pp=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,Lp=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,Ip="gl_FragColor = linearToOutputTexel( gl_FragColor );",Np=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,Dp=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,Up=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	uniform samplerCube envMap;
	#ifdef ENVMAP_TYPE_PMREM
		float roughnessToMip( const in float roughness ) {
			float r = clamp( roughness, 0.0, 1.0 );
			return ENVMAP_MAX_LOD * r * ( 2.0 - r );
		}
	#endif
#endif`,Op=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,Fp=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,Bp=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,kp=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,Vp=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Hp=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,zp=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Gp=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,Wp=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,Xp=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,qp=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Yp=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_SUN_LIGHTS > 0
	struct SunLight {
		vec3 direction;
		vec3 color;
	};
	uniform SunLight sunLights[ NUM_SUN_LIGHTS ];
	void getSunLightInfo( const in SunLight sunLight, out IncidentLight light ) {
		light.color = sunLight.color;
		light.direction = sunLight.direction;
		light.visible = true;
	}
#endif
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`,Kp=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_PMREM
			vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
			vec4 envMapColor = textureLod( envMap, envMapRotation * worldNormal, ENVMAP_MAX_LOD );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_PMREM
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );
			vec4 envMapColor = textureLod( envMap, envMapRotation * reflectVec, roughnessToMip( roughness ) );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_RETROREFLECTION
		vec3 getIBLRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
			#ifdef ENVMAP_TYPE_PMREM
				vec3 retroVec = normalize( mix( viewDir, normal, pow4( roughness ) ) );
				retroVec = transformDirectionByInverseViewMatrix( retroVec, viewMatrix );
				vec4 envMapColor = textureLod( envMap, envMapRotation * retroVec, roughnessToMip( roughness ) );
				return envMapColor.rgb * envMapIntensity;
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_PMREM
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
		#ifdef USE_RETROREFLECTION
			vec3 getIBLAnisotropyRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
				#ifdef ENVMAP_TYPE_PMREM
					vec3 bentNormal = cross( bitangent, viewDir );
					bentNormal = normalize( cross( bentNormal, bitangent ) );
					bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
					return getIBLRetroRadiance( viewDir, bentNormal, roughness );
				#else
					return vec3( 0.0 );
				#endif
			}
		#endif
	#endif
#endif`,$p=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,Zp=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,Jp=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Qp=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,jp=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.045 );
material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef USE_DIFFUSE_ROUGHNESS
	float diffuseRoughnessFactor = diffuseRoughness;
	#ifdef USE_DIFFUSE_ROUGHNESSMAP
		diffuseRoughnessFactor *= texture2D( diffuseRoughnessMap, vDiffuseRoughnessMapUv ).r;
	#endif
	material.diffuseRoughness = saturate( diffuseRoughnessFactor );
#endif
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.045 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_RETROREFLECTION
	material.retroreflectivity = retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,em=`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	vec2 dfg;
	vec3 multiScatteringCompensation;
	#ifdef USE_DIFFUSE_ROUGHNESS
		float diffuseRoughness;
	#endif
	#ifdef USE_RETROREFLECTION
		float retroreflectivity;
	#endif
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0Dielectric;
		vec3 iridescenceF0Metallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
#ifdef USE_DIFFUSE_ROUGHNESS
	const float EON_EPSILON = 1e-7;
	float FON_DirectionalAlbedo( const in float mu, const in float roughness, const in float A ) {
		float muComp = 1.0 - mu;
		float gOverPi = muComp * ( 0.0571085289 + muComp * ( 0.491881867 + muComp * ( - 0.332181442 + muComp * 0.0714429953 ) ) );
		return A * ( 1.0 + roughness * gOverPi );
	}
	vec3 BRDF_EON( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 diffuseColor, const in float roughness ) {
		vec3 rho = saturate( diffuseColor );
		if ( roughness <= EON_EPSILON ) return BRDF_Lambert( rho );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float s = dot( lightDir, viewDir ) - dotNL * dotNV;
		float sOverT = ( s > 0.0 ) ? s / max( max( dotNL, dotNV ), EON_EPSILON ) : s;
		float A = 1.0 / ( 1.0 + ( 0.5 - 2.0 / ( 3.0 * PI ) ) * roughness );
		vec3 singleScatter = rho * RECIPROCAL_PI * A * ( 1.0 + roughness * sOverT );
		float averageAlbedo = A * ( 1.0 + ( 2.0 / 3.0 - 28.0 / ( 15.0 * PI ) ) * roughness );
		float albedoV = FON_DirectionalAlbedo( dotNV, roughness, A );
		float albedoL = FON_DirectionalAlbedo( dotNL, roughness, A );
		vec3 rhoMultiScatter = rho * rho * averageAlbedo / max( vec3( EON_EPSILON ), vec3( 1.0 ) - rho * ( 1.0 - averageAlbedo ) );
		vec3 multiScatter = rhoMultiScatter * RECIPROCAL_PI
			* max( EON_EPSILON, 1.0 - albedoV )
			* max( EON_EPSILON, 1.0 - albedoL )
			/ max( EON_EPSILON, 1.0 - averageAlbedo );
		return singleScatter + multiScatter;
	}
	vec3 EON_DirectionalAlbedo( const in vec3 diffuseColor, const in float roughness, const in float dotNV ) {
		vec3 rho = saturate( diffuseColor );
		if ( roughness <= EON_EPSILON ) return rho;
		float A = 1.0 / ( 1.0 + ( 0.5 - 2.0 / ( 3.0 * PI ) ) * roughness );
		float directionalAlbedo = FON_DirectionalAlbedo( dotNV, roughness, A );
		float averageAlbedo = A * ( 1.0 + ( 2.0 / 3.0 - 28.0 / ( 15.0 * PI ) ) * roughness );
		vec3 rhoMultiScatter = rho * rho * averageAlbedo / max( vec3( EON_EPSILON ), vec3( 1.0 ) - rho * ( 1.0 - averageAlbedo ) );
		return rho * directionalAlbedo + rhoMultiScatter * ( 1.0 - directionalAlbedo );
	}
#endif
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = max( material.clearcoatRoughness, 0.045 );
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = max( material.roughness, 0.045 );
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float alphaT = max( material.alphaT, alpha );
		float V = V_GGX_SmithCorrelated_Anisotropic( alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec2 fab, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec2 fab, const in vec3 specularColor, const in float specularF90, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	vec3 specularBRDF = BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	#ifdef USE_RETROREFLECTION
		vec3 retroViewDir = reflect( - geometryViewDir, geometryNormal );
		vec3 retroSpecularBRDF = BRDF_GGX( directLight.direction, retroViewDir, geometryNormal, material );
		specularBRDF = mix( specularBRDF, retroSpecularBRDF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directSpecular += irradiance * specularBRDF * material.multiScatteringCompensation;
	vec3 halfDir = normalize( directLight.direction + geometryViewDir );
	float dotVH = saturate( dot( geometryViewDir, halfDir ) );
	vec3 F = F_Schlick( material.specularColor, material.specularF90, dotVH );
	#ifdef USE_RETROREFLECTION
		vec3 retroHalfDir = normalize( directLight.direction + retroViewDir );
		float dotRetroVH = saturate( dot( retroViewDir, retroHalfDir ) );
		vec3 retroF = F_Schlick( material.specularColor, material.specularF90, dotRetroVH );
		F = mix( F, retroF, saturate( material.retroreflectivity ) );
	#endif
	#ifdef USE_DIFFUSE_ROUGHNESS
		vec3 diffuseBRDF = BRDF_EON( directLight.direction, geometryViewDir, geometryNormal, material.diffuseColor, material.diffuseRoughness ) * ( 1.0 - material.metalness );
	#else
		vec3 diffuseBRDF = BRDF_Lambert( material.diffuseContribution );
	#endif
	reflectedLight.directDiffuse += irradiance * diffuseBRDF * ( 1.0 - F );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScattering, multiScattering );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScattering, multiScattering );
	#endif
	#ifdef USE_DIFFUSE_ROUGHNESS
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		vec3 diffuseAlbedo = EON_DirectionalAlbedo( material.diffuseColor, material.diffuseRoughness, dotNV ) * ( 1.0 - material.metalness );
		vec3 diffuse = irradiance * RECIPROCAL_PI * diffuseAlbedo * ( 1.0 - singleScattering - multiScattering );
	#else
		vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - singleScattering - multiScattering );
	#endif
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		sheenSpecularIndirect += irradiance * material.sheenColor * sheenAlbedo * RECIPROCAL_PI;
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( material.dfg, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceF0Metallic, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( material.dfg, material.diffuseColor, material.specularF90, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	#ifdef USE_DIFFUSE_ROUGHNESS
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		vec3 diffuse = EON_DirectionalAlbedo( material.diffuseColor, material.diffuseRoughness, dotNV ) * ( 1.0 - material.metalness ) * ( 1.0 - totalScatteringDielectric );
	#else
		vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	#endif
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,tm=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		vec3 iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		vec3 iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( iridescenceFresnelDielectric, iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0Dielectric = Schlick_to_F0( iridescenceFresnelDielectric, 1.0, dotNVi );
		material.iridescenceF0Metallic = Schlick_to_F0( iridescenceFresnelMetallic, 1.0, dotNVi );
	}
#endif
#ifdef STANDARD
	float dotNVms = saturate( dot( geometryNormal, geometryViewDir ) );
	material.dfg = texture2D( dfgLUT, vec2( material.roughness, dotNVms ) ).rg;
	#if ( NUM_SUN_LIGHTS > 0 || NUM_DIR_LIGHTS > 0 || NUM_POINT_LIGHTS > 0 || NUM_SPOT_LIGHTS > 0 )
		float EssMs = material.dfg.x + material.dfg.y;
		material.multiScatteringCompensation = 1.0 + material.specularColorBlended * ( 1.0 / EssMs - 1.0 );
	#endif
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SUN_LIGHTS > 0 ) && defined( RE_Direct )
	SunLight sunLight;
	#if defined( USE_SHADOWMAP ) && NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHTS; i ++ ) {
		sunLight = sunLights[ i ];
		getSunLightInfo( sunLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SUN_LIGHT_SHADOWS )
		sunLightShadow = sunLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getSunShadow( sunShadowMap[ i ], sunLightShadow, UNROLLED_LOOP_INDEX ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_LIGHT_PROBE_GRIDS > 0
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = transformNormalByInverseViewMatrix( geometryNormal, viewMatrix );
		int probeGrid = - 1;
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_LIGHT_PROBE_GRIDS; i ++ ) {
			if ( isInsideLightProbeGrid( probeWorldPos, probeWorldNormal, probesMin[ i ], probesMax[ i ], probesResolution[ i ] ) ) probeGrid = UNROLLED_LOOP_INDEX;
		}
		#pragma unroll_loop_end
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_LIGHT_PROBE_GRIDS; i ++ ) {
			if ( probeGrid == UNROLLED_LOOP_INDEX ) irradiance += getLightProbeGridIrradiance( probesSH[ i ], probesMin[ i ], probesMax[ i ], probesResolution[ i ], probeWorldPos, probeWorldNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,nm=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_PMREM )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		vec3 iblRadiance = getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		vec3 iblRadiance = getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_RETROREFLECTION
		#ifdef USE_ANISOTROPY
			vec3 retroIBLRadiance = getIBLAnisotropyRetroRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
		#else
			vec3 retroIBLRadiance = getIBLRetroRadiance( geometryViewDir, geometryNormal, material.roughness );
		#endif
		iblRadiance = mix( iblRadiance, retroIBLRadiance, saturate( material.retroreflectivity ) );
	#endif
	radiance += iblRadiance;
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,im=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,rm=`#if NUM_LIGHT_PROBE_GRIDS > 0
uniform highp sampler3D probesSH[ NUM_LIGHT_PROBE_GRIDS ];
uniform vec3 probesMin[ NUM_LIGHT_PROBE_GRIDS ];
uniform vec3 probesMax[ NUM_LIGHT_PROBE_GRIDS ];
uniform vec3 probesResolution[ NUM_LIGHT_PROBE_GRIDS ];
bool isInsideLightProbeGrid( vec3 worldPos, vec3 worldNormal, vec3 probesMin, vec3 probesMax, vec3 probesResolution ) {
	vec3 spacing = ( probesMax - probesMin ) / probesResolution;
	vec3 samplePos = worldPos + worldNormal * spacing * 0.5;
	vec3 margin = spacing * 0.01;
	return all( greaterThanEqual( samplePos, probesMin - margin ) ) && all( lessThanEqual( samplePos, probesMax + margin ) );
}
vec3 getLightProbeGridIrradiance( highp sampler3D probesSH, vec3 probesMin, vec3 probesMax, vec3 probesResolution, vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 probeSpacing = gridRange / res;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.5 / res, 1.0 - 0.5 / res );
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,sm=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,om=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,am=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,lm=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,cm=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,um=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,hm=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,dm=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,fm=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,pm=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,mm=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,gm=`#if defined( USE_MORPHCOLORS )
	#if defined( USE_COLOR_ALPHA )
		vColor *= morphTargetBaseInfluence;
	#elif defined( USE_COLOR )
		vColor.rgb *= morphTargetBaseInfluence;
	#endif
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor.rgb += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,_m=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,vm=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,xm=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Mm=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#ifdef DOUBLE_SIDED
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#ifdef DOUBLE_SIDED
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,Sm=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,ym=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Tm=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Em=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,bm=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,Am=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,wm=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,Rm=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,Cm=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,Pm=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,Lm=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,Im=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,Nm=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,Dm=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,Um=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,Om=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,Fm=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,Bm=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		#define SUN_LIGHT_CASCADES 2
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#else
			uniform sampler2D sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#endif
		uniform mat4 sunShadowMatrix[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		uniform vec4 sunShadowCascade[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
		struct SunLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SunLightShadow sunLightShadows[ NUM_SUN_LIGHT_SHADOWS ];
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				vec2 radius = shadowRadius * texelSize;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_SUN_LIGHT_SHADOWS > 0
		float getSunShadow(
			#if defined( SHADOWMAP_TYPE_PCF )
				sampler2DShadow shadowMap,
			#else
				sampler2D shadowMap,
			#endif
			SunLightShadow sunLightShadow,
			int shadowIndex
		) {
			vec4 shadowWorldPosition = vec4( vSunShadowWorldPosition.xyz + vSunShadowWorldNormal * sunLightShadow.shadowNormalBias, 1.0 );
			float viewDepth = vSunShadowWorldPosition.w;
			int cascadeOffset = shadowIndex * SUN_LIGHT_CASCADES;
			float shadow = 1.0;
			for ( int i = SUN_LIGHT_CASCADES - 1; i >= 0; i -- ) {
				vec4 cascade = sunShadowCascade[ cascadeOffset + i ];
				if ( viewDepth >= cascade.x && viewDepth < cascade.y ) {
					float cascadeShadow = getShadow(
						shadowMap,
						sunLightShadow.shadowMapSize,
						sunLightShadow.shadowIntensity,
						sunLightShadow.shadowBias,
						sunLightShadow.shadowRadius,
						sunShadowMatrix[ cascadeOffset + i ] * shadowWorldPosition
					);
					shadow = mix( cascadeShadow, shadow, smoothstep( cascade.z, cascade.y, viewDepth ) );
				}
			}
			return shadow;
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float lightDistance = length( lightToPosition );
			float depthRange = shadowCameraFar - shadowCameraNear;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float depthA = - shadowCameraNear / depthRange - shadowBias;
				float depthB = shadowCameraNear * shadowCameraFar / ( depthRange * lightDistance );
			#else
				float depthA = shadowCameraFar / depthRange + shadowBias;
				float depthB = - shadowCameraNear * shadowCameraFar / ( depthRange * lightDistance );
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			shadow = 0.0;
			for ( int i = 0; i < 5; i ++ ) {
				vec2 offset = vogelDiskSample( i, 5, phi );
				vec3 direction = bd3D + ( tangent * offset.x + bitangent * offset.y ) * texelSize;
				vec3 absDirection = abs( direction );
				float dp = depthA + depthB / max( max( absDirection.x, absDirection.y ), absDirection.z );
				shadow += texture( shadowMap, vec4( direction, dp ) );
			}
			shadow *= 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,km=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,Vm=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SUN_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_SUN_LIGHT_SHADOWS > 0
		vSunShadowWorldPosition = vec4( worldPosition.xyz, - mvPosition.z );
		vSunShadowWorldNormal = shadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,Hm=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHT_SHADOWS; i ++ ) {
		sunLight = sunLightShadows[ i ];
		shadow *= receiveShadow ? getSunShadow( sunShadowMap[ i ], sunLight, UNROLLED_LOOP_INDEX ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,zm=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,Gm=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,Wm=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,Xm=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,qm=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,Ym=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,Km=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,$m=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,Zm=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,Jm=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,Qm=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_DIFFUSE_ROUGHNESSMAP
	varying vec2 vDiffuseRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,jm=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_DIFFUSE_ROUGHNESSMAP
	uniform mat3 diffuseRoughnessMapTransform;
	varying vec2 vDiffuseRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,eg=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DIFFUSE_ROUGHNESSMAP
	vDiffuseRoughnessMapUv = ( diffuseRoughnessMapTransform * vec3( DIFFUSE_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,tg=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const ng=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,ig=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,rg=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,sg=`uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <envmap_common_pars_fragment>
void main() {
	#ifdef ENVMAP_TYPE_PMREM
		vec4 texColor = textureLod( envMap, backgroundRotation * vWorldDirection, roughnessToMip( backgroundBlurriness ) );
	#else
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,og=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,ag=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,lg=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,cg=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,ug=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,hg=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,dg=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,fg=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,pg=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,mg=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,gg=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,_g=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,vg=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,xg=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Mg=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,Sg=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,yg=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,Tg=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,Eg=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,bg=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Ag=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,wg=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DIFFUSE_ROUGHNESS
	uniform float diffuseRoughness;
	#ifdef USE_DIFFUSE_ROUGHNESSMAP
		uniform sampler2D diffuseRoughnessMap;
	#endif
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_RETROREFLECTION
	uniform float retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Rg=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Cg=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Pg=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,Lg=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Ig=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Ng=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Dg=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Ug=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Je={alphahash_fragment:ip,alphahash_pars_fragment:rp,alphamap_fragment:sp,alphamap_pars_fragment:op,alphatest_fragment:ap,alphatest_pars_fragment:lp,aomap_fragment:cp,aomap_pars_fragment:up,batching_pars_vertex:hp,batching_vertex:dp,begin_vertex:fp,beginnormal_vertex:pp,bsdfs:mp,iridescence_fragment:gp,bumpmap_pars_fragment:_p,clipping_planes_fragment:vp,clipping_planes_pars_fragment:xp,clipping_planes_pars_vertex:Mp,clipping_planes_vertex:Sp,color_fragment:yp,color_pars_fragment:Tp,color_pars_vertex:Ep,color_vertex:bp,common:Ap,defaultnormal_vertex:wp,displacementmap_pars_vertex:Rp,displacementmap_vertex:Cp,emissivemap_fragment:Pp,emissivemap_pars_fragment:Lp,colorspace_fragment:Ip,colorspace_pars_fragment:Np,envmap_fragment:Dp,envmap_common_pars_fragment:Up,envmap_pars_fragment:Op,envmap_pars_vertex:Fp,envmap_physical_pars_fragment:Kp,envmap_vertex:Bp,fog_vertex:kp,fog_pars_vertex:Vp,fog_fragment:Hp,fog_pars_fragment:zp,gradientmap_pars_fragment:Gp,lightmap_pars_fragment:Wp,lights_lambert_fragment:Xp,lights_lambert_pars_fragment:qp,lights_pars_begin:Yp,lights_toon_fragment:$p,lights_toon_pars_fragment:Zp,lights_phong_fragment:Jp,lights_phong_pars_fragment:Qp,lights_physical_fragment:jp,lights_physical_pars_fragment:em,lights_fragment_begin:tm,lights_fragment_maps:nm,lights_fragment_end:im,lightprobes_pars_fragment:rm,logdepthbuf_fragment:sm,logdepthbuf_pars_fragment:om,logdepthbuf_pars_vertex:am,logdepthbuf_vertex:lm,map_fragment:cm,map_pars_fragment:um,map_particle_fragment:hm,map_particle_pars_fragment:dm,metalnessmap_fragment:fm,metalnessmap_pars_fragment:pm,morphinstance_vertex:mm,morphcolor_vertex:gm,morphnormal_vertex:_m,morphtarget_pars_vertex:vm,morphtarget_vertex:xm,normal_fragment_begin:Mm,normal_fragment_maps:Sm,normal_pars_fragment:ym,normal_pars_vertex:Tm,normal_vertex:Em,normalmap_pars_fragment:bm,clearcoat_normal_fragment_begin:Am,clearcoat_normal_fragment_maps:wm,clearcoat_pars_fragment:Rm,iridescence_pars_fragment:Cm,opaque_fragment:Pm,packing:Lm,premultiplied_alpha_fragment:Im,project_vertex:Nm,dithering_fragment:Dm,dithering_pars_fragment:Um,roughnessmap_fragment:Om,roughnessmap_pars_fragment:Fm,shadowmap_pars_fragment:Bm,shadowmap_pars_vertex:km,shadowmap_vertex:Vm,shadowmask_pars_fragment:Hm,skinbase_vertex:zm,skinning_pars_vertex:Gm,skinning_vertex:Wm,skinnormal_vertex:Xm,specularmap_fragment:qm,specularmap_pars_fragment:Ym,tonemapping_fragment:Km,tonemapping_pars_fragment:$m,transmission_fragment:Zm,transmission_pars_fragment:Jm,uv_pars_fragment:Qm,uv_pars_vertex:jm,uv_vertex:eg,worldpos_vertex:tg,background_vert:ng,background_frag:ig,backgroundCube_vert:rg,backgroundCube_frag:sg,cube_vert:og,cube_frag:ag,depth_vert:lg,depth_frag:cg,distance_vert:ug,distance_frag:hg,equirect_vert:dg,equirect_frag:fg,linedashed_vert:pg,linedashed_frag:mg,meshbasic_vert:gg,meshbasic_frag:_g,meshlambert_vert:vg,meshlambert_frag:xg,meshmatcap_vert:Mg,meshmatcap_frag:Sg,meshnormal_vert:yg,meshnormal_frag:Tg,meshphong_vert:Eg,meshphong_frag:bg,meshphysical_vert:Ag,meshphysical_frag:wg,meshtoon_vert:Rg,meshtoon_frag:Cg,points_vert:Pg,points_frag:Lg,shadow_vert:Ig,shadow_frag:Ng,sprite_vert:Dg,sprite_frag:Ug},xe={common:{diffuse:{value:new Ne(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Oe},alphaMap:{value:null},alphaMapTransform:{value:new Oe},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Oe}},envmap:{envMap:{value:null},envMapRotation:{value:new Oe},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Oe}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Oe}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Oe},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Oe},normalScale:{value:new Ye(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Oe},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Oe}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Oe}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Oe}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Ne(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},sunLights:{value:[],properties:{direction:{},color:{}}},sunLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},sunShadowMatrix:{value:[]},sunShadowCascade:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:[]},probesMin:{value:[]},probesMax:{value:[]},probesResolution:{value:[]}},points:{diffuse:{value:new Ne(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Oe},alphaTest:{value:0},uvTransform:{value:new Oe}},sprite:{diffuse:{value:new Ne(16777215)},opacity:{value:1},center:{value:new Ye(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Oe},alphaMap:{value:null},alphaMapTransform:{value:new Oe},alphaTest:{value:0}}},Nn={basic:{uniforms:qt([xe.common,xe.specularmap,xe.envmap,xe.aomap,xe.lightmap,xe.fog]),vertexShader:Je.meshbasic_vert,fragmentShader:Je.meshbasic_frag},lambert:{uniforms:qt([xe.common,xe.specularmap,xe.envmap,xe.aomap,xe.lightmap,xe.emissivemap,xe.bumpmap,xe.normalmap,xe.displacementmap,xe.fog,xe.lights,{emissive:{value:new Ne(0)},envMapIntensity:{value:1}}]),vertexShader:Je.meshlambert_vert,fragmentShader:Je.meshlambert_frag},phong:{uniforms:qt([xe.common,xe.specularmap,xe.envmap,xe.aomap,xe.lightmap,xe.emissivemap,xe.bumpmap,xe.normalmap,xe.displacementmap,xe.fog,xe.lights,{emissive:{value:new Ne(0)},specular:{value:new Ne(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:Je.meshphong_vert,fragmentShader:Je.meshphong_frag},standard:{uniforms:qt([xe.common,xe.envmap,xe.aomap,xe.lightmap,xe.emissivemap,xe.bumpmap,xe.normalmap,xe.displacementmap,xe.roughnessmap,xe.metalnessmap,xe.fog,xe.lights,{emissive:{value:new Ne(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Je.meshphysical_vert,fragmentShader:Je.meshphysical_frag},toon:{uniforms:qt([xe.common,xe.aomap,xe.lightmap,xe.emissivemap,xe.bumpmap,xe.normalmap,xe.displacementmap,xe.gradientmap,xe.fog,xe.lights,{emissive:{value:new Ne(0)}}]),vertexShader:Je.meshtoon_vert,fragmentShader:Je.meshtoon_frag},matcap:{uniforms:qt([xe.common,xe.bumpmap,xe.normalmap,xe.displacementmap,xe.fog,{matcap:{value:null}}]),vertexShader:Je.meshmatcap_vert,fragmentShader:Je.meshmatcap_frag},points:{uniforms:qt([xe.points,xe.fog]),vertexShader:Je.points_vert,fragmentShader:Je.points_frag},dashed:{uniforms:qt([xe.common,xe.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Je.linedashed_vert,fragmentShader:Je.linedashed_frag},depth:{uniforms:qt([xe.common,xe.displacementmap]),vertexShader:Je.depth_vert,fragmentShader:Je.depth_frag},normal:{uniforms:qt([xe.common,xe.bumpmap,xe.normalmap,xe.displacementmap,{opacity:{value:1}}]),vertexShader:Je.meshnormal_vert,fragmentShader:Je.meshnormal_frag},sprite:{uniforms:qt([xe.sprite,xe.fog]),vertexShader:Je.sprite_vert,fragmentShader:Je.sprite_frag},background:{uniforms:{uvTransform:{value:new Oe},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Je.background_vert,fragmentShader:Je.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Oe}},vertexShader:Je.backgroundCube_vert,fragmentShader:Je.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Je.cube_vert,fragmentShader:Je.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Je.equirect_vert,fragmentShader:Je.equirect_frag},distance:{uniforms:qt([xe.common,xe.displacementmap,{referencePosition:{value:new C},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Je.distance_vert,fragmentShader:Je.distance_frag},shadow:{uniforms:qt([xe.lights,xe.fog,{color:{value:new Ne(0)},opacity:{value:1}}]),vertexShader:Je.shadow_vert,fragmentShader:Je.shadow_frag}};Nn.physical={uniforms:qt([Nn.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Oe},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Oe},clearcoatNormalScale:{value:new Ye(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Oe},diffuseRoughness:{value:0},diffuseRoughnessMap:{value:null},diffuseRoughnessMapTransform:{value:new Oe},dispersion:{value:0},retroreflectivity:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Oe},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Oe},sheen:{value:0},sheenColor:{value:new Ne(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Oe},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Oe},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Oe},transmissionSamplerSize:{value:new Ye},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Oe},attenuationDistance:{value:0},attenuationColor:{value:new Ne(0)},specularColor:{value:new Ne(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Oe},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Oe},anisotropyVector:{value:new Ye},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Oe}}]),vertexShader:Je.meshphysical_vert,fragmentShader:Je.meshphysical_frag};const qs={r:0,b:0,g:0},Og=new Ve,nd=new Oe;nd.set(-1,0,0,0,1,0,0,0,1);function Fg(i,e,t,n,r,s){const o=new Ne(0);let a=r===!0?0:1,l,c,u=null,h=0,d=null;function f(x){let A=x.isScene===!0?x.background:null;if(A&&A.isTexture){const y=x.backgroundBlurriness>0;A=e.get(A,y)}return A}function g(x){let A=!1;const y=f(x);y===null?p(o,a):y&&y.isColor&&(p(y,1),A=!0);const b=i.xr.getEnvironmentBlendMode();b==="additive"?t.buffers.color.setClear(0,0,0,1,s):b==="alpha-blend"&&t.buffers.color.setClear(0,0,0,0,s),(i.autoClear||A)&&(t.buffers.depth.setTest(!0),t.buffers.depth.setMask(!0),t.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function v(x,A){const y=f(A);y&&y.isCubeTexture?(c===void 0&&(c=new wt(new ki(1,1,1),new xi({name:"BackgroundCubeMaterial",uniforms:Sr(Nn.backgroundCube.uniforms),vertexShader:Nn.backgroundCube.vertexShader,fragmentShader:Nn.backgroundCube.fragmentShader,side:Yt,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),c.geometry.deleteAttribute("uv"),c.onBeforeRender=function(b,E,_){this.matrixWorld.copyPosition(_.matrixWorld)},Object.defineProperty(c.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),n.update(c)),c.material.uniforms.envMap.value=y,c.material.uniforms.backgroundBlurriness.value=A.backgroundBlurriness,c.material.uniforms.backgroundIntensity.value=A.backgroundIntensity,c.material.uniforms.backgroundRotation.value.setFromMatrix4(Og.makeRotationFromEuler(A.backgroundRotation)).transpose(),y.isRenderTargetTexture===!1&&c.material.uniforms.backgroundRotation.value.premultiply(nd),c.material.toneMapped=tt.getTransfer(y.colorSpace)!==gt,(u!==y||h!==y.version||d!==i.toneMapping)&&(c.material.needsUpdate=!0,u=y,h=y.version,d=i.toneMapping),c.layers.enableAll(),x.unshift(c,c.geometry,c.material,0,0,null)):y&&y.isTexture&&(l===void 0&&(l=new wt(new Mr(2,2),new xi({name:"BackgroundMaterial",uniforms:Sr(Nn.background.uniforms),vertexShader:Nn.background.vertexShader,fragmentShader:Nn.background.fragmentShader,side:gi,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),n.update(l)),l.material.uniforms.t2D.value=y,l.material.uniforms.backgroundIntensity.value=A.backgroundIntensity,l.material.toneMapped=tt.getTransfer(y.colorSpace)!==gt,y.matrixAutoUpdate===!0&&y.updateMatrix(),l.material.uniforms.uvTransform.value.copy(y.matrix),(u!==y||h!==y.version||d!==i.toneMapping)&&(l.material.needsUpdate=!0,u=y,h=y.version,d=i.toneMapping),l.layers.enableAll(),x.unshift(l,l.geometry,l.material,0,0,null))}function p(x,A){x.getRGB(qs,Kh(i)),t.buffers.color.setClear(qs.r,qs.g,qs.b,A,s)}function m(){c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0),l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0)}return{getClearColor:function(){return o},setClearColor:function(x,A=1){o.set(x),a=A,p(o,a)},getClearAlpha:function(){return a},setClearAlpha:function(x){a=x,p(o,a)},render:g,addToRenderList:v,dispose:m}}function Bg(i,e){const t=i.getParameter(i.MAX_VERTEX_ATTRIBS),n={},r=d(null);let s=r,o=!1;function a(N,O,W,L,G){let z=!1;const B=h(N,L,W,O);s!==B&&(s=B,c(s.object)),z=f(N,L,W,G),z&&g(N,L,W,G),G!==null&&e.update(G,i.ELEMENT_ARRAY_BUFFER),(z||o)&&(o=!1,y(N,O,W,L),G!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,e.get(G).buffer))}function l(){return i.createVertexArray()}function c(N){return i.bindVertexArray(N)}function u(N){return i.deleteVertexArray(N)}function h(N,O,W,L){const G=L.wireframe===!0;let z=n[O.id];z===void 0&&(z={},n[O.id]=z);const B=N.isInstancedMesh===!0?N.id:0;let ee=z[B];ee===void 0&&(ee={},z[B]=ee);let Y=ee[W.id];Y===void 0&&(Y={},ee[W.id]=Y);let Z=Y[G];return Z===void 0&&(Z=d(l()),Y[G]=Z),Z}function d(N){const O=[],W=[],L=[];for(let G=0;G<t;G++)O[G]=0,W[G]=0,L[G]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:O,enabledAttributes:W,attributeDivisors:L,object:N,attributes:{},index:null}}function f(N,O,W,L){const G=s.attributes,z=O.attributes;let B=0;const ee=W.getAttributes();for(const Y in ee)if(ee[Y].location>=0){const te=G[Y];let ye=z[Y];if(ye===void 0&&(Y==="instanceMatrix"&&N.instanceMatrix&&(ye=N.instanceMatrix),Y==="instanceColor"&&N.instanceColor&&(ye=N.instanceColor)),te===void 0||te.attribute!==ye||ye&&te.data!==ye.data)return!0;B++}return s.attributesNum!==B||s.index!==L}function g(N,O,W,L){const G={},z=O.attributes;let B=0;const ee=W.getAttributes();for(const Y in ee)if(ee[Y].location>=0){let te=z[Y];te===void 0&&(Y==="instanceMatrix"&&N.instanceMatrix&&(te=N.instanceMatrix),Y==="instanceColor"&&N.instanceColor&&(te=N.instanceColor));const ye={};ye.attribute=te,te&&te.data&&(ye.data=te.data),G[Y]=ye,B++}s.attributes=G,s.attributesNum=B,s.index=L}function v(){const N=s.newAttributes;for(let O=0,W=N.length;O<W;O++)N[O]=0}function p(N){m(N,0)}function m(N,O){const W=s.newAttributes,L=s.enabledAttributes,G=s.attributeDivisors;W[N]=1,L[N]===0&&(i.enableVertexAttribArray(N),L[N]=1),G[N]!==O&&(i.vertexAttribDivisor(N,O),G[N]=O)}function x(){const N=s.newAttributes,O=s.enabledAttributes;for(let W=0,L=O.length;W<L;W++)O[W]!==N[W]&&(i.disableVertexAttribArray(W),O[W]=0)}function A(N,O,W,L,G,z,B){B===!0?i.vertexAttribIPointer(N,O,W,G,z):i.vertexAttribPointer(N,O,W,L,G,z)}function y(N,O,W,L){v();const G=L.attributes,z=W.getAttributes(),B=O.defaultAttributeValues;for(const ee in z){const Y=z[ee];if(Y.location>=0){let Z=G[ee];if(Z===void 0&&(ee==="instanceMatrix"&&N.instanceMatrix&&(Z=N.instanceMatrix),ee==="instanceColor"&&N.instanceColor&&(Z=N.instanceColor)),Z!==void 0){const te=Z.normalized,ye=Z.itemSize,ke=e.get(Z);if(ke===void 0)continue;const Q=ke.buffer,me=ke.type,Me=ke.bytesPerElement,Pe=me===i.INT||me===i.UNSIGNED_INT||Z.gpuType===Sl;if(Z.isInterleavedBufferAttribute){const _e=Z.data,Be=_e.isInterleavedBuffer===!0?_e.stride:_e.itemSize,dt=Z.offset;if(_e.isInstancedInterleavedBuffer||_e.isInstancedBufferAttribute){for(let Ce=0;Ce<Y.locationSize;Ce++)m(Y.location+Ce,_e.meshPerAttribute);N.isInstancedMesh!==!0&&L._maxInstanceCount===void 0&&(L._maxInstanceCount=_e.meshPerAttribute*_e.count)}else for(let Ce=0;Ce<Y.locationSize;Ce++)p(Y.location+Ce);i.bindBuffer(i.ARRAY_BUFFER,Q);for(let Ce=0;Ce<Y.locationSize;Ce++)A(Y.location+Ce,ye/Y.locationSize,me,te,Be*Me,(dt+ye/Y.locationSize*Ce)*Me,Pe)}else{if(Z.isInstancedBufferAttribute){for(let _e=0;_e<Y.locationSize;_e++)m(Y.location+_e,Z.meshPerAttribute);N.isInstancedMesh!==!0&&L._maxInstanceCount===void 0&&(L._maxInstanceCount=Z.meshPerAttribute*Z.count)}else for(let _e=0;_e<Y.locationSize;_e++)p(Y.location+_e);i.bindBuffer(i.ARRAY_BUFFER,Q);for(let _e=0;_e<Y.locationSize;_e++)A(Y.location+_e,ye/Y.locationSize,me,te,ye*Me,ye/Y.locationSize*_e*Me,Pe)}}else if(B!==void 0){const te=B[ee];if(te!==void 0)switch(te.length){case 2:i.vertexAttrib2fv(Y.location,te);break;case 3:i.vertexAttrib3fv(Y.location,te);break;case 4:i.vertexAttrib4fv(Y.location,te);break;default:i.vertexAttrib1fv(Y.location,te)}}}}x()}function b(){D();for(const N in n){const O=n[N];for(const W in O){const L=O[W];for(const G in L){const z=L[G];for(const B in z)u(z[B].object),delete z[B];delete L[G]}}delete n[N]}}function E(N){if(n[N.id]===void 0)return;const O=n[N.id];for(const W in O){const L=O[W];for(const G in L){const z=L[G];for(const B in z)u(z[B].object),delete z[B];delete L[G]}}delete n[N.id]}function _(N){for(const O in n){const W=n[O];for(const L in W){const G=W[L];if(G[N.id]===void 0)continue;const z=G[N.id];for(const B in z)u(z[B].object),delete z[B];delete G[N.id]}}}function S(N){for(const O in n){const W=n[O],L=N.isInstancedMesh===!0?N.id:0,G=W[L];if(G!==void 0){for(const z in G){const B=G[z];for(const ee in B)u(B[ee].object),delete B[ee];delete G[z]}delete W[L],Object.keys(W).length===0&&delete n[O]}}}function D(){R(),o=!0,s!==r&&(s=r,c(s.object))}function R(){r.geometry=null,r.program=null,r.wireframe=!1}return{setup:a,reset:D,resetDefaultState:R,dispose:b,releaseStatesOfGeometry:E,releaseStatesOfObject:S,releaseStatesOfProgram:_,initAttributes:v,enableAttribute:p,disableUnusedAttributes:x}}function kg(i,e,t){let n;function r(l){n=l}function s(l,c){i.drawArrays(n,l,c),t.update(c,n,1)}function o(l,c,u){u!==0&&(i.drawArraysInstanced(n,l,c,u),t.update(c,n,u))}function a(l,c,u){if(u===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,l,0,c,0,u);let d=0;for(let f=0;f<u;f++)d+=c[f];t.update(d,n,1)}this.setMode=r,this.render=s,this.renderInstances=o,this.renderMultiDraw=a}function Vg(i,e,t,n){let r;function s(){if(r!==void 0)return r;if(e.has("EXT_texture_filter_anisotropic")===!0){const _=e.get("EXT_texture_filter_anisotropic");r=i.getParameter(_.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else r=0;return r}function o(_){return!(_!==xn&&n.convert(_)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function a(_){const S=_===Bn&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(_!==en&&_!==ln&&!S&&n.convert(_)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE))}function l(_){if(_==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";_="mediump"}return _==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=t.precision!==void 0?t.precision:"highp";const u=l(c);u!==c&&(De("WebGLRenderer:",c,"not supported, using",u,"instead."),c=u);const h=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control"),d=t.logarithmicDepthBuffer===!0&&h===!1;t.reversedDepthBuffer===!0&&h===!1&&De("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer."),t.logarithmicDepthBuffer===!0&&h===!0&&De("WebGLRenderer: Logarithmic depth buffer is ignored when reversed depth buffer is enabled.");const f=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),g=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),v=i.getParameter(i.MAX_TEXTURE_SIZE),p=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),m=i.getParameter(i.MAX_VERTEX_ATTRIBS),x=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),A=i.getParameter(i.MAX_VARYING_VECTORS),y=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),b=i.getParameter(i.MAX_SAMPLES),E=i.getParameter(i.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:s,getMaxPrecision:l,textureFormatReadable:o,textureTypeReadable:a,precision:c,logarithmicDepthBuffer:d,reversedDepthBuffer:h,maxTextures:f,maxVertexTextures:g,maxTextureSize:v,maxCubemapSize:p,maxAttributes:m,maxVertexUniforms:x,maxVaryings:A,maxFragmentUniforms:y,maxSamples:b,samples:E}}function Hg(i){const e=this;let t=null,n=0,r=!1,s=!1;const o=new di,a=new Oe,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(h,d){const f=h.length!==0||d||n!==0||r;return r=d,n=h.length,f},this.beginShadows=function(){s=!0,u(null)},this.endShadows=function(){s=!1},this.setGlobalState=function(h,d){t=u(h,d,0)},this.setState=function(h,d,f){const g=h.clippingPlanes,v=h.clipIntersection,p=h.clipShadows,m=i.get(h);if(!r||g===null||g.length===0||s&&!p)s?u(null):c();else{const x=s?0:n,A=x*4;let y=m.clippingState||null;l.value=y,y=u(g,d,A,f);for(let b=0;b!==A;++b)y[b]=t[b];m.clippingState=y,this.numIntersection=v?this.numPlanes:0,this.numPlanes+=x}};function c(){l.value!==t&&(l.value=t,l.needsUpdate=n>0),e.numPlanes=n,e.numIntersection=0}function u(h,d,f,g){const v=h!==null?h.length:0;let p=null;if(v!==0){if(p=l.value,g!==!0||p===null){const m=f+v*4,x=d.matrixWorldInverse;a.getNormalMatrix(x),(p===null||p.length<m)&&(p=new Float32Array(m));for(let A=0,y=f;A!==v;++A,y+=4)o.copy(h[A]).applyMatrix4(x,a),o.normal.toArray(p,y),p[y+3]=o.constant}l.value=p,l.needsUpdate=!0}return e.numPlanes=v,e.numIntersection=0,p}}class Hl extends On{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const n={width:e,height:e,depth:1},r=[n,n,n,n,n,n];this.texture=new Xh(r),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},r=new ki(5,5,5),s=new xi({name:"CubemapFromEquirect",uniforms:Sr(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:Yt,blending:hr});s.uniforms.tEquirect.value=t;const o=new wt(r,s),a=t.minFilter;return t.minFilter===vn&&(t.minFilter=Bt),new ul(1,10,this).update(e,o),t.minFilter=a,o.geometry.dispose(),o.material.dispose(),this}clear(e,t=!0,n=!0,r=!0){const s=e.getRenderTarget();for(let o=0;o<6;o++)e.setRenderTarget(this,o),e.clear(t,n,r);e.setRenderTarget(s)}}const Zc=256,zg=3,Gg=20,id=256,rd=16,Wg=3,Xg=new C,qg=new Ne;class vo{constructor(e){this._renderer=e,this._cubeSize=0,this._sourceTarget=null,this._cubeCamera=new ul(1,10,null),this._boxMesh=new wt(new ki(5,5,5),null),this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null,this._integrationMaterial=null}fromScene(e,t=0,n=.1,r=100,s={}){const{size:o=256,position:a=Xg}=s,l=this._renderer;this._setSize(o);const c=this._allocateTarget(),u=this._getSourceTarget(!0);t>0&&(u.texture.mipmapsAutoUpdate=!1);const h=l.autoClear,d=l.autoClearColor,f=l.autoClearDepth,g=l.autoClearStencil,v=e.background;l.autoClear=!0,l.autoClearColor=!0,l.autoClearDepth=!0,l.autoClearStencil=!0,v===null&&(e.background=l.getClearColor(qg));const p=new ul(n,r,u);return p.position.copy(a),p.update(l,e),l.autoClear=h,l.autoClearColor=d,l.autoClearDepth=f,l.autoClearStencil=g,e.background=v,t>0&&(u.texture.mipmapsAutoUpdate=!0,this._blur(c,t)),this._applyPMREM(c),c}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=jc(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Qc(),this._compileMaterial(this._equirectMaterial))}dispose(){this._sourceTarget!==null&&this._sourceTarget.dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._integrationMaterial!==null&&this._integrationMaterial.dispose(),this._boxMesh.geometry.dispose()}static lodToRoughness(e,t){return t>0?1-Math.sqrt(1-e/t):0}_setSize(e){this._cubeSize=Math.max(Zc,Oh(e))}_fromTexture(e,t){e.mapping===gr||e.mapping===ss?this._setSize(e.image.length===0?Zc:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4);const n=t||this._allocateTarget();return this._textureToCubemap(e),this._applyPMREM(n),n}_allocateTarget(){const e=this._cubeSize,t=Jc(e,!1,!1),n=Math.log2(e)-zg;for(let r=0;r<=n;r++)t.texture.mipmaps.push({width:e>>r,height:e>>r});return t.texture.name="PMREM",t.texture.isPMREMTexture=!0,t}_getSourceTarget(e=!1){const t=this._cubeSize,n=this._sourceTarget;return(n===null||n.width!==t||e&&n.depthBuffer===!1)&&(n!==null&&n.dispose(),this._sourceTarget=Jc(t,!0,e)),this._sourceTarget}_compileMaterial(e){this._boxMesh.material=e,this._renderer.compile(this._boxMesh,this._cubeCamera.children[0])}_renderCube(e,t,n){const r=this._boxMesh,s=this._cubeCamera;r.material=n,s.renderTarget=e,s.activeMipmapLevel=t;const o=e.width>>t;e.viewport.set(0,0,o,o),s.update(this._renderer,r),e.viewport.set(0,0,e.width,e.height)}_textureToCubemap(e){let t;e.mapping===gr||e.mapping===ss?(this._cubemapMaterial===null&&(this._cubemapMaterial=jc()),t=this._cubemapMaterial,t.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):(this._equirectMaterial===null&&(this._equirectMaterial=Qc()),t=this._equirectMaterial),t.uniforms.envMap.value=e,this._renderCube(this._getSourceTarget(),0,t)}_applyPMREM(e){this._ggxMaterial===null&&(this._ggxMaterial=Yg(),this._integrationMaterial=Kg());const t=this._cubeSize,n=e.texture.mipmaps.length-1,r=this._ggxMaterial.uniforms;r.envMap.value=this._sourceTarget.texture;const s=this._integrationMaterial.uniforms;s.envMap.value=this._sourceTarget.texture,s.sourceLod.value=Math.log2(t/rd);for(let o=0;o<=n;o++){const a=vo.lodToRoughness(o,n);if(o>n-Wg)s.roughness.value=a,this._renderCube(e,o,this._integrationMaterial);else{const l=a>0?Math.log2(t)+.5*Math.log2(6/(id*Math.pow(a,4)))+.5:0;r.roughness.value=a,r.lodBias.value=l,this._renderCube(e,o,this._ggxMaterial)}}}_blur(e,t){this._blurMaterial===null&&(this._blurMaterial=$g());const n=this._blurMaterial,r=n.uniforms,s=this._sourceTarget;r.sigma.value=Math.min(t,Math.PI)/Math.SQRT2,r.envMap.value=s.texture,this._renderCube(e,0,n),r.envMap.value=e.texture,this._renderCube(s,0,n)}}function Jc(i,e,t){return new Hl(i,{minFilter:vn,generateMipmaps:e,type:Bn,colorSpace:tn,depthBuffer:t})}function vs(i,e,t){return new xi({name:i,uniforms:e,vertexShader:Je.cube_vert,fragmentShader:t,side:Yt,blending:hr,depthTest:!1,depthWrite:!1})}function Yg(){return vs("PMREMGGXConvolution",{envMap:{value:null},roughness:{value:0},lodBias:{value:0}},`

		#define GGX_SAMPLES ${id}u

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float roughness;
		uniform float lodBias;

		#include <common>

		// Van der Corput radical inverse
		float radicalInverse_VdC( uint bits ) {

			bits = ( bits << 16u ) | ( bits >> 16u );
			bits = ( ( bits & 0x55555555u ) << 1u ) | ( ( bits & 0xAAAAAAAAu ) >> 1u );
			bits = ( ( bits & 0x33333333u ) << 2u ) | ( ( bits & 0xCCCCCCCCu ) >> 2u );
			bits = ( ( bits & 0x0F0F0F0Fu ) << 4u ) | ( ( bits & 0xF0F0F0F0u ) >> 4u );
			bits = ( ( bits & 0x00FF00FFu ) << 8u ) | ( ( bits & 0xFF00FF00u ) >> 8u );
			return float( bits ) * 2.3283064365386963e-10; // / 0x100000000

		}

		// Hammersley sequence
		vec2 hammersley( uint i, uint N ) {

			return vec2( float( i ) / float( N ), radicalInverse_VdC( i ) );

		}

		void main() {

			vec3 N = normalize( vWorldDirection );

			// For very low roughness, just sample the environment directly
			if ( roughness < 0.001 ) {

				gl_FragColor = vec4( textureLod( envMap, N, 0.0 ).rgb, 1.0 );
				return;

			}

			float alpha = roughness * roughness;
			float alpha2 = alpha * alpha;

			// Tangent space basis for VNDF sampling
			vec3 up = abs( N.z ) < 0.999 ? vec3( 0.0, 0.0, 1.0 ) : vec3( 1.0, 0.0, 0.0 );
			vec3 tangent = normalize( cross( up, N ) );
			vec3 bitangent = cross( N, tangent );

			vec3 prefilteredColor = vec3( 0.0 );
			float totalWeight = 0.0;

			for ( uint i = 0u; i < GGX_SAMPLES; i ++ ) {

				vec2 Xi = hammersley( i, GGX_SAMPLES );

				// With V = N, sample the reflected direction directly.
				float invQ = 1.0 / ( 1.0 - Xi.x + alpha2 * Xi.x );
				float NdotL = ( 1.0 - Xi.x - alpha2 * Xi.x ) * invQ;

				if ( NdotL > 0.0 ) {

					float phi = 2.0 * PI * Xi.y;
					float sinTheta = 2.0 * alpha * sqrt( Xi.x * ( 1.0 - Xi.x ) ) * invQ;
					vec3 L = N * NdotL + ( tangent * cos( phi ) + bitangent * sin( phi ) ) * sinTheta;

					// Match the source mip to the sample's solid angle. The terms
					// independent of the sample are precomputed in lodBias.
					float d = alpha2 * invQ;
					float lod = max( log2( d ) + lodBias, 0.0 );

					// Weight by NdotL for the split-sum approximation
					prefilteredColor += textureLod( envMap, L, lod ).rgb * NdotL;
					totalWeight += NdotL;

				}

			}

			gl_FragColor = vec4( prefilteredColor / totalWeight, 1.0 );

		}
	`)}function Kg(){return vs("PMREMGGXIntegration",{envMap:{value:null},roughness:{value:0},sourceLod:{value:0},sourceSize:{value:rd}},`

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float roughness;
		uniform float sourceLod;
		uniform int sourceSize;

		void main() {

			vec3 N = normalize( vWorldDirection );

			float alpha = roughness * roughness;
			float alpha2 = alpha * alpha;

			float texelSize = 2.0 / float( sourceSize );

			vec3 prefilteredColor = vec3( 0.0 );
			float totalWeight = 0.0;

			// Pair opposite texels: only the one in N's hemisphere contributes.
			for ( int face = 0; face < 3; face ++ ) {

				for ( int y = 0; y < sourceSize; y ++ ) {

					for ( int x = 0; x < sourceSize; x ++ ) {

						vec2 uv = ( vec2( x, y ) + 0.5 ) * texelSize - 1.0;
						vec3 texelDirection = face == 0 ? vec3( 1.0, uv ) : ( face == 1 ? vec3( uv.x, 1.0, uv.y ) : vec3( uv, 1.0 ) );

						float invDistance = inversesqrt( 1.0 + dot( uv, uv ) );
						float NdotL = dot( N, texelDirection );
						texelDirection *= NdotL < 0.0 ? - 1.0 : 1.0;
						NdotL = abs( NdotL ) * invDistance;

						// With V = N, NdotH squared is ( 1 + NdotL ) / 2. Common factors
						// in the GGX distribution and texel solid angle cancel when normalized.
						float d = 1.0 + alpha2 + ( alpha2 - 1.0 ) * NdotL;
						float weight = NdotL * invDistance * invDistance * invDistance / ( d * d );

						prefilteredColor += textureLod( envMap, texelDirection, sourceLod ).rgb * weight;
						totalWeight += weight;

					}

				}

			}

			gl_FragColor = vec4( prefilteredColor / totalWeight, 1.0 );

		}
	`)}function $g(){return vs("PMREMSphericalGaussianBlur",{envMap:{value:null},sigma:{value:0}},`

		#define SAMPLES ${Gg}
		#define GOLDEN_ANGLE 2.39996322973

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float sigma;

		#include <common>

		void main() {

			vec3 outputDirection = normalize( vWorldDirection );

			vec3 up = abs( outputDirection.z ) < 0.999 ? vec3( 0.0, 0.0, 1.0 ) : vec3( 1.0, 0.0, 0.0 );
			vec3 tangent = normalize( cross( up, outputDirection ) );
			vec3 bitangent = cross( outputDirection, tangent );

			// Truncate the kernel at three standard deviations or at the antipode.
			float thetaMax = min( 3.0 * sigma, PI );
			float truncation = 1.0 - exp( - 0.5 * thetaMax * thetaMax / ( sigma * sigma ) );

			vec3 accumColor = vec3( 0.0 );
			float accumWeight = 0.0;

			for ( int i = 0; i < SAMPLES; i ++ ) {

				// Stratified inverse-CDF sampling of the Gaussian, placed on a golden-angle spiral.
				float stratum = ( float( i ) + 0.5 ) / float( SAMPLES );
				float theta = sigma * sqrt( - 2.0 * log( 1.0 - stratum * truncation ) );
				float phi = float( i ) * GOLDEN_ANGLE;

				vec3 offset = cos( phi ) * tangent + sin( phi ) * bitangent;
				vec3 sampleDirection = cos( theta ) * outputDirection + sin( theta ) * offset;

				// Correct the planar sample density to solid angle.
				float weight = sin( theta ) / theta;

				accumColor += weight * textureLod( envMap, sampleDirection, 0.0 ).rgb;
				accumWeight += weight;

			}

			gl_FragColor = vec4( accumColor / accumWeight, 1.0 );

		}
	`)}function Qc(){return vs("PMREMEquirectangularToCubemap",{envMap:{value:null}},`

		varying vec3 vWorldDirection;

		uniform sampler2D envMap;

		#include <common>

		void main() {

			// Average four subpixel samples to preserve small, bright features.
			vec3 direction = normalize( vWorldDirection );
			vec3 dx = dFdx( direction ) * 0.25;
			vec3 dy = dFdy( direction ) * 0.25;

			vec3 color = textureLod( envMap, equirectUv( normalize( direction - dx - dy ) ), 0.0 ).rgb;
			color += textureLod( envMap, equirectUv( normalize( direction + dx - dy ) ), 0.0 ).rgb;
			color += textureLod( envMap, equirectUv( normalize( direction - dx + dy ) ), 0.0 ).rgb;
			color += textureLod( envMap, equirectUv( normalize( direction + dx + dy ) ), 0.0 ).rgb;
			gl_FragColor = vec4( color * 0.25, 1.0 );

		}
	`)}function jc(){return vs("PMREMCubemapToCubemap",{envMap:{value:null},flipEnvMap:{value:-1}},`

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float flipEnvMap;

		void main() {

			gl_FragColor = vec4( textureCube( envMap, vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) ).rgb, 1.0 );

		}
	`)}function Zg(i){let e=new WeakMap,t=new WeakMap,n=null;function r(d,f=!1){return d==null?null:f?o(d):s(d)}function s(d){if(d&&d.isTexture){const f=d.mapping;if(f===Po||f===Lo)if(e.has(d)){const g=e.get(d).texture;return a(g,d.mapping)}else{const g=d.image;if(g&&g.height>0){const v=new Hl(g.height);return v.fromEquirectangularTexture(i,d),e.set(d,v),d.addEventListener("dispose",c),a(v.texture,d.mapping)}else return null}}return d}function o(d){if(d&&d.isTexture&&d.isPMREMTexture!==!0){const f=d.mapping,g=f===Po||f===Lo,v=f===gr||f===ss;if(g||v){let p=t.get(d);const m=p!==void 0?p.texture.pmremVersion:0;if(d.isRenderTargetTexture&&d.pmremVersion!==m)return n===null&&(n=new vo(i)),p=g?n.fromEquirectangular(d,p):n.fromCubemap(d,p),p.texture.pmremVersion=d.pmremVersion,t.set(d,p),p.texture;if(p!==void 0)return p.texture;{const x=d.image;return g&&x&&x.height>0||v&&x&&l(x)?(n===null&&(n=new vo(i)),p=g?n.fromEquirectangular(d):n.fromCubemap(d),p.texture.pmremVersion=d.pmremVersion,t.set(d,p),d.addEventListener("dispose",u),p.texture):null}}}return d}function a(d,f){return f===Po?d.mapping=gr:f===Lo&&(d.mapping=ss),d}function l(d){let f=0;const g=6;for(let v=0;v<g;v++)d[v]!==void 0&&f++;return f===g}function c(d){const f=d.target;f.removeEventListener("dispose",c);const g=e.get(f);g!==void 0&&(e.delete(f),g.dispose())}function u(d){const f=d.target;f.removeEventListener("dispose",u);const g=t.get(f);g!==void 0&&(t.delete(f),g.dispose())}function h(){e=new WeakMap,t=new WeakMap,n!==null&&(n.dispose(),n=null)}return{get:r,dispose:h}}function Jg(i){const e={};function t(n){if(e[n]!==void 0)return e[n];const r=i.getExtension(n);return e[n]=r,r}return{has:function(n){return t(n)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(n){const r=t(n);return r===null&&dr("WebGLRenderer: "+n+" extension not supported."),r}}}function Qg(i,e,t,n){const r={},s=new WeakMap,o=new FinalizationRegistry(g=>delete r[g]);function a(g){l(g.target)}function l(g){g.index!==null&&e.remove(g.index);for(const p in g.attributes)e.remove(g.attributes[p]);g.removeEventListener("dispose",a),delete r[g.id],o.unregister(g);const v=s.get(g);v&&(e.remove(v),s.delete(g)),n.releaseStatesOfGeometry(g),g.isInstancedBufferGeometry===!0&&delete g._maxInstanceCount,t.memory.geometries--}function c(g,v){return r[v.id]!==void 0||(v.addEventListener("dispose",a),r[v.id]=new WeakRef(v),o.register(v,v.id,v),t.memory.geometries++),v}function u(g){const v=g.attributes;for(const p in v)e.update(v[p],i.ARRAY_BUFFER)}function h(g){const v=g.index,p=g.attributes.position;let m=0;if(p===void 0)return;const x=v!==null?v.array.length:p.array.length/3-1,A=p.count>=65535?Hh:Vh,y=new A(Math.ceil(x/3)*6,1),b=y.array;if(v!==null){const _=v.array;m=v.version;for(let S=0,D=0;S<x;S+=3){const R=_[S+0],N=_[S+1],O=_[S+2];b[D++]=R,b[D++]=N,b[D++]=N,b[D++]=O,b[D++]=O,b[D++]=R}}else{m=p.version;for(let _=0,S=0;_<x;_+=3){const D=_+0,R=_+1,N=_+2;b[S++]=D,b[S++]=R,b[S++]=R,b[S++]=N,b[S++]=N,b[S++]=D}}y.version=m;const E=s.get(g);E&&e.remove(E),s.set(g,y)}function d(g){const v=s.get(g);if(v){const p=g.index;p!==null&&v.version<p.version&&h(g)}else h(g);return s.get(g)}function f(){for(const g in r){const v=r[g].deref();v!==void 0&&l(v)}}return{get:c,update:u,getWireframeAttribute:d,dispose:f}}function jg(i,e,t){let n;function r(h){n=h}let s,o;function a(h){s=h.type,o=h.bytesPerElement}function l(h,d){i.drawElements(n,d,s,h*o),t.update(d,n,1)}function c(h,d,f){f!==0&&(i.drawElementsInstanced(n,d,s,h*o,f),t.update(d,n,f))}function u(h,d,f){if(f===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,d,0,s,h,0,f);let v=0;for(let p=0;p<f;p++)v+=d[p];t.update(v,n,1)}this.setMode=r,this.setIndex=a,this.render=l,this.renderInstances=c,this.renderMultiDraw=u}function e_(i){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function n(s,o,a){switch(t.calls++,o){case i.TRIANGLES:t.triangles+=a*(s/3);break;case i.LINES:t.lines+=a*(s/2);break;case i.LINE_STRIP:t.lines+=a*(s-1);break;case i.LINE_LOOP:t.lines+=a*s;break;case i.POINTS:t.points+=a*s;break;default:Xe("WebGLInfo: Unknown draw mode:",o);break}}function r(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:r,update:n}}function t_(i,e,t){const n=new WeakMap,r=new xt;function s(o,a,l){const c=o.morphTargetInfluences,u=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,h=u!==void 0?u.length:0;let d=n.get(a);if(d===void 0||d.count!==h){let D=function(){_.dispose(),n.delete(a),a.removeEventListener("dispose",D)};d!==void 0&&d.texture.dispose();const f=a.morphAttributes.position!==void 0,g=a.morphAttributes.normal!==void 0,v=a.morphAttributes.color!==void 0,p=a.morphAttributes.position||[],m=a.morphAttributes.normal||[],x=a.morphAttributes.color||[];let A=0;f===!0&&(A=1),g===!0&&(A=2),v===!0&&(A=3);let y=a.attributes.position.count*A,b=1;y>e.maxTextureSize&&(b=Math.ceil(y/e.maxTextureSize),y=e.maxTextureSize);const E=new Float32Array(y*b*4*h),_=new Fh(E,y,b,h);_.type=ln,_.needsUpdate=!0;const S=A*4;for(let R=0;R<h;R++){const N=p[R],O=m[R],W=x[R],L=y*b*4*R;for(let G=0;G<N.count;G++){const z=G*S;f===!0&&(r.fromBufferAttribute(N,G),E[L+z+0]=r.x,E[L+z+1]=r.y,E[L+z+2]=r.z,E[L+z+3]=0),g===!0&&(r.fromBufferAttribute(O,G),E[L+z+4]=r.x,E[L+z+5]=r.y,E[L+z+6]=r.z,E[L+z+7]=0),v===!0&&(r.fromBufferAttribute(W,G),E[L+z+8]=r.x,E[L+z+9]=r.y,E[L+z+10]=r.z,E[L+z+11]=W.itemSize===4?r.w:1)}}d={count:h,texture:_,size:new Ye(y,b)},n.set(a,d),a.addEventListener("dispose",D)}if(o.isInstancedMesh===!0&&o.morphTexture!==null)l.getUniforms().setValue(i,"morphTexture",o.morphTexture,t);else{let f=0;for(let v=0;v<c.length;v++)f+=c[v];const g=a.morphTargetsRelative?1:1-f;l.getUniforms().setValue(i,"morphTargetBaseInfluence",g),l.getUniforms().setValue(i,"morphTargetInfluences",c)}l.getUniforms().setValue(i,"morphTargetsTexture",d.texture,t),l.getUniforms().setValue(i,"morphTargetsTextureSize",d.size)}return{update:s}}function n_(i,e,t,n,r){let s=new WeakMap;function o(c){const u=r.render.frame,h=c.geometry,d=e.get(c,h);if(s.get(d)!==u&&(e.update(d),s.set(d,u)),c.isInstancedMesh&&(c.hasEventListener("dispose",l)===!1&&c.addEventListener("dispose",l),s.get(c)!==u&&(t.update(c.instanceMatrix,i.ARRAY_BUFFER),c.instanceColor!==null&&t.update(c.instanceColor,i.ARRAY_BUFFER),s.set(c,u))),c.isSkinnedMesh){const f=c.skeleton;s.get(f)!==u&&(f.update(),s.set(f,u))}return d}function a(){s=new WeakMap}function l(c){const u=c.target;u.removeEventListener("dispose",l),n.releaseStatesOfObject(u),t.remove(u.instanceMatrix),u.instanceColor!==null&&t.remove(u.instanceColor)}return{update:o,dispose:a}}const i_={[gh]:"LINEAR_TONE_MAPPING",[_h]:"REINHARD_TONE_MAPPING",[vh]:"CINEON_TONE_MAPPING",[Ml]:"ACES_FILMIC_TONE_MAPPING",[Mh]:"AGX_TONE_MAPPING",[Sh]:"NEUTRAL_TONE_MAPPING",[xh]:"CUSTOM_TONE_MAPPING"};function r_(i,e,t,n,r,s){const o=new On(e,t,{type:i,depthBuffer:r,stencilBuffer:s,samples:n?4:0,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,resolveDepthBuffer:!1,resolveStencilBuffer:!1});let a=null,l=null,c=null;const u=new Et;u.setAttribute("position",new Nt([-1,3,0,-1,-1,0,3,-1,0],3)),u.setAttribute("uv",new Nt([0,2,0,0,2,0],2));const h=new _0({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),d=new wt(u,h),f=new Bl(-1,1,1,-1,0,1);let g=null,v=null,p=!1,m,x=null,A=[],y=!1;this.setSize=function(b,E){o.setSize(b,E),a!==null&&a.setSize(b,E),l!==null&&l.setSize(b,E);for(let _=0;_<A.length;_++){const S=A[_];S.setSize&&S.setSize(b,E)}},this.setEffects=function(b){A=b,y=A.length>0&&A[0].isRenderPass===!0;const E=o.width,_=o.height;A.length>0&&a===null&&(a=new On(E,_,{type:Bn,depthBuffer:!1,stencilBuffer:!1}),l=new On(E,_,{type:Bn,depthBuffer:!1,stencilBuffer:!1}));const S=r===!0&&A.some(D=>D.needsDepthTexture===!0);S!==(o.depthTexture!==null)&&(S===!0&&c===null&&(c=new xr(E,_),s===!0&&(c.format=mi,c.type=_r)),o.dispose(),o.depthTexture=S?c:null,o.resolveDepthBuffer=S,o.storeMultisampledDepthBuffer=S);for(let D=0;D<A.length;D++){const R=A[D];R.setSize&&R.setSize(E,_),S&&R.needsDepthTexture===!0&&R.setDepthTexture&&R.setDepthTexture(c)}},this.begin=function(b,E){if(p||b.toneMapping===jn&&A.length===0)return!1;if(x=E,E!==null){const _=E.width,S=E.height;(o.width!==_||o.height!==S)&&this.setSize(_,S)}return y===!1&&b.setRenderTarget(o),m=b.toneMapping,b.toneMapping=jn,!0},this.hasRenderPass=function(){return y},this.end=function(b,E){b.toneMapping=m,p=!0;let _=o,S=a;for(let D=0;D<A.length;D++){const R=A[D];R.enabled!==!1&&(R.render(b,S,_,E),R.needsSwap!==!1&&(_=S,S=S===a?l:a))}if(g!==b.outputColorSpace||v!==b.toneMapping){g=b.outputColorSpace,v=b.toneMapping,h.defines={},tt.getTransfer(g)===gt&&(h.defines.SRGB_TRANSFER="");const D=i_[v];D&&(h.defines[D]=""),h.needsUpdate=!0}h.uniforms.tDiffuse.value=_.texture,b.setRenderTarget(x),b.render(d,f),x=null,p=!1},this.isCompositing=function(){return p},this.dispose=function(){o.dispose(),a!==null&&a.dispose(),l!==null&&l.dispose(),u.dispose(),h.dispose()}}const sd=new Lt,od=new xr(1,1),ad=new qh(1),ld=new Fh,cd=new Xf,ud=new Xh,eu=[],tu=[],nu=new Float32Array(16),iu=new Float32Array(9),ru=new Float32Array(4);function wr(i,e,t){const n=i[0];if(n<=0||n>0)return i;const r=e*t;let s=eu[r];if(s===void 0&&(s=new Float32Array(r),eu[r]=s),e!==0){n.toArray(s,0);for(let o=1,a=0;o!==e;++o)a+=t,i[o].toArray(s,a)}return s}function Dt(i,e){if(i.length!==e.length)return!1;for(let t=0,n=i.length;t<n;t++)if(i[t]!==e[t])return!1;return!0}function Ut(i,e){for(let t=0,n=e.length;t<n;t++)i[t]=e[t]}function Ro(i,e){let t=tu[e];t===void 0&&(t=new Int32Array(e),tu[e]=t);for(let n=0;n!==e;++n)t[n]=i.allocateTextureUnit();return t}function s_(i,e){const t=this.cache;t[0]!==e&&(i.uniform1f(this.addr,e),t[0]=e)}function o_(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Dt(t,e))return;i.uniform2fv(this.addr,e),Ut(t,e)}}function a_(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(i.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(Dt(t,e))return;i.uniform3fv(this.addr,e),Ut(t,e)}}function l_(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Dt(t,e))return;i.uniform4fv(this.addr,e),Ut(t,e)}}function c_(i,e){const t=this.cache,n=e.elements;if(n===void 0){if(Dt(t,e))return;i.uniformMatrix2fv(this.addr,!1,e),Ut(t,e)}else{if(Dt(t,n))return;ru.set(n),i.uniformMatrix2fv(this.addr,!1,ru),Ut(t,n)}}function u_(i,e){const t=this.cache,n=e.elements;if(n===void 0){if(Dt(t,e))return;i.uniformMatrix3fv(this.addr,!1,e),Ut(t,e)}else{if(Dt(t,n))return;iu.set(n),i.uniformMatrix3fv(this.addr,!1,iu),Ut(t,n)}}function h_(i,e){const t=this.cache,n=e.elements;if(n===void 0){if(Dt(t,e))return;i.uniformMatrix4fv(this.addr,!1,e),Ut(t,e)}else{if(Dt(t,n))return;nu.set(n),i.uniformMatrix4fv(this.addr,!1,nu),Ut(t,n)}}function d_(i,e){const t=this.cache;t[0]!==e&&(i.uniform1i(this.addr,e),t[0]=e)}function f_(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Dt(t,e))return;i.uniform2iv(this.addr,e),Ut(t,e)}}function p_(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Dt(t,e))return;i.uniform3iv(this.addr,e),Ut(t,e)}}function m_(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Dt(t,e))return;i.uniform4iv(this.addr,e),Ut(t,e)}}function g_(i,e){const t=this.cache;t[0]!==e&&(i.uniform1ui(this.addr,e),t[0]=e)}function __(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Dt(t,e))return;i.uniform2uiv(this.addr,e),Ut(t,e)}}function v_(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Dt(t,e))return;i.uniform3uiv(this.addr,e),Ut(t,e)}}function x_(i,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Dt(t,e))return;i.uniform4uiv(this.addr,e),Ut(t,e)}}function Co(i){return i.version===0&&(i.compareFunction=Nh,i.needsUpdate=!0),i}function M_(i,e,t){const n=this.cache,r=t.allocateTextureUnit();n[0]!==r&&(i.uniform1i(this.addr,r),n[0]=r);let s;this.type===i.SAMPLER_2D_SHADOW?s=Co(od):s=sd,t.setTexture2D(e||s,r)}function S_(i,e,t){const n=this.cache,r=t.allocateTextureUnit();n[0]!==r&&(i.uniform1i(this.addr,r),n[0]=r),t.setTexture3D(e||cd,r)}function y_(i,e,t){const n=this.cache,r=t.allocateTextureUnit();n[0]!==r&&(i.uniform1i(this.addr,r),n[0]=r);let s;this.type===i.SAMPLER_CUBE_SHADOW?s=Co(ad):s=ud,t.setTextureCube(e||s,r)}function T_(i,e,t){const n=this.cache,r=t.allocateTextureUnit();n[0]!==r&&(i.uniform1i(this.addr,r),n[0]=r),t.setTexture2DArray(e||ld,r)}function E_(i){switch(i){case 5126:return s_;case 35664:return o_;case 35665:return a_;case 35666:return l_;case 35674:return c_;case 35675:return u_;case 35676:return h_;case 5124:case 35670:return d_;case 35667:case 35671:return f_;case 35668:case 35672:return p_;case 35669:case 35673:return m_;case 5125:return g_;case 36294:return __;case 36295:return v_;case 36296:return x_;case 35678:case 36198:case 36298:case 36306:case 35682:return M_;case 35679:case 36299:case 36307:return S_;case 35680:case 36300:case 36308:case 36293:return y_;case 36289:case 36303:case 36311:case 36292:return T_}}function b_(i,e){i.uniform1fv(this.addr,e)}function A_(i,e){const t=wr(e,this.size,2);i.uniform2fv(this.addr,t)}function w_(i,e){const t=wr(e,this.size,3);i.uniform3fv(this.addr,t)}function R_(i,e){const t=wr(e,this.size,4);i.uniform4fv(this.addr,t)}function C_(i,e){const t=wr(e,this.size,4);i.uniformMatrix2fv(this.addr,!1,t)}function P_(i,e){const t=wr(e,this.size,9);i.uniformMatrix3fv(this.addr,!1,t)}function L_(i,e){const t=wr(e,this.size,16);i.uniformMatrix4fv(this.addr,!1,t)}function I_(i,e){i.uniform1iv(this.addr,e)}function N_(i,e){i.uniform2iv(this.addr,e)}function D_(i,e){i.uniform3iv(this.addr,e)}function U_(i,e){i.uniform4iv(this.addr,e)}function O_(i,e){i.uniform1uiv(this.addr,e)}function F_(i,e){i.uniform2uiv(this.addr,e)}function B_(i,e){i.uniform3uiv(this.addr,e)}function k_(i,e){i.uniform4uiv(this.addr,e)}function V_(i,e,t){const n=this.cache,r=e.length,s=Ro(t,r);Dt(n,s)||(i.uniform1iv(this.addr,s),Ut(n,s));let o;this.type===i.SAMPLER_2D_SHADOW?o=Co(od):o=sd;for(let a=0;a!==r;++a)t.setTexture2D(e[a]||o,s[a])}function H_(i,e,t){const n=this.cache,r=e.length,s=Ro(t,r);Dt(n,s)||(i.uniform1iv(this.addr,s),Ut(n,s));for(let o=0;o!==r;++o)t.setTexture3D(e[o]||cd,s[o])}function z_(i,e,t){const n=this.cache,r=e.length,s=Ro(t,r);Dt(n,s)||(i.uniform1iv(this.addr,s),Ut(n,s));let o;this.type===i.SAMPLER_CUBE_SHADOW?o=Co(ad):o=ud;for(let a=0;a!==r;++a)t.setTextureCube(e[a]||o,s[a])}function G_(i,e,t){const n=this.cache,r=e.length,s=Ro(t,r);Dt(n,s)||(i.uniform1iv(this.addr,s),Ut(n,s));for(let o=0;o!==r;++o)t.setTexture2DArray(e[o]||ld,s[o])}function W_(i){switch(i){case 5126:return b_;case 35664:return A_;case 35665:return w_;case 35666:return R_;case 35674:return C_;case 35675:return P_;case 35676:return L_;case 5124:case 35670:return I_;case 35667:case 35671:return N_;case 35668:case 35672:return D_;case 35669:case 35673:return U_;case 5125:return O_;case 36294:return F_;case 36295:return B_;case 36296:return k_;case 35678:case 36198:case 36298:case 36306:case 35682:return V_;case 35679:case 36299:case 36307:return H_;case 35680:case 36300:case 36308:case 36293:return z_;case 36289:case 36303:case 36311:case 36292:return G_}}class X_{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=E_(t.type)}}class q_{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=W_(t.type)}}class Y_{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){const r=this.seq;for(let s=0,o=r.length;s!==o;++s){const a=r[s];a.setValue(e,t[a.id],n)}}}const sa=/(\w+)(\])?(\[|\.)?/g;function su(i,e){i.seq.push(e),i.map[e.id]=e}function K_(i,e,t){const n=i.name,r=n.length;for(sa.lastIndex=0;;){const s=sa.exec(n),o=sa.lastIndex;let a=s[1];const l=s[2]==="]",c=s[3];if(l&&(a=a|0),c===void 0||c==="["&&o+2===r){su(t,c===void 0?new X_(a,i,e):new q_(a,i,e));break}else{let h=t.map[a];h===void 0&&(h=new Y_(a),su(t,h)),t=h}}}class io{constructor(e,t){this.seq=[],this.map={};const n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let o=0;o<n;++o){const a=e.getActiveUniform(t,o),l=e.getUniformLocation(t,a.name);K_(a,l,this)}const r=[],s=[];for(const o of this.seq)o.type===e.SAMPLER_2D_SHADOW||o.type===e.SAMPLER_CUBE_SHADOW||o.type===e.SAMPLER_2D_ARRAY_SHADOW?r.push(o):s.push(o);r.length>0&&(this.seq=r.concat(s))}setValue(e,t,n,r){const s=this.map[t];s!==void 0&&s.setValue(e,n,r)}setOptional(e,t,n){const r=t[n];r!==void 0&&this.setValue(e,n,r)}static upload(e,t,n,r){for(let s=0,o=t.length;s!==o;++s){const a=t[s],l=n[a.id];l.needsUpdate!==!1&&a.setValue(e,l.value,r)}}static seqWithValue(e,t){const n=[];for(let r=0,s=e.length;r!==s;++r){const o=e[r];o.id in t&&n.push(o)}return n}}function ou(i,e,t){const n=i.createShader(e);return i.shaderSource(n,t),i.compileShader(n),n}const $_=37297;let Z_=0;function J_(i,e){const t=i.split(`
`),n=[],r=Math.max(e-6,0),s=Math.min(e+6,t.length);for(let o=r;o<s;o++){const a=o+1;n.push(`${a===e?">":" "} ${a}: ${t[o]}`)}return n.join(`
`)}const au=new Oe;function Q_(i){tt._getMatrix(au,tt.workingColorSpace,i);const e=`mat3( ${au.elements.map(t=>t.toFixed(4))} )`;switch(tt.getTransfer(i)){case ho:return[e,"LinearTransferOETF"];case gt:return[e,"sRGBTransferOETF"];default:return De("WebGLProgram: Unsupported color space: ",i),[e,"LinearTransferOETF"]}}function lu(i,e,t){const n=i.getShaderParameter(e,i.COMPILE_STATUS),s=(i.getShaderInfoLog(e)||"").trim();if(n&&s==="")return"";const o=/ERROR: 0:(\d+)/.exec(s);if(o){const a=parseInt(o[1]);return t.toUpperCase()+`

`+s+`

`+J_(i.getShaderSource(e),a)}else return s}function j_(i,e){const t=Q_(e);return[`vec4 ${i}( vec4 value ) {`,`	return ${t[1]}( vec4( ${t[0]} * value.rgb, value.a ) );`,"}"].join(`
`)}const ev={[gh]:"Linear",[_h]:"Reinhard",[vh]:"Cineon",[Ml]:"ACESFilmic",[Mh]:"AgX",[Sh]:"Neutral",[xh]:"Custom"};function tv(i,e){const t=ev[e];return t===void 0?(De("WebGLProgram: Unsupported toneMapping:",e),"vec3 "+i+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+i+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}const Ys=new C;function nv(){tt.getLuminanceCoefficients(Ys);const i=Ys.x.toFixed(4),e=Ys.y.toFixed(4),t=Ys.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function iv(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Zr).join(`
`)}function rv(i){const e=[];for(const t in i){const n=i[t];n!==!1&&e.push("#define "+t+" "+n)}return e.join(`
`)}function sv(i,e){const t={},n=i.getProgramParameter(e,i.ACTIVE_ATTRIBUTES);for(let r=0;r<n;r++){const s=i.getActiveAttrib(e,r),o=s.name;let a=1;s.type===i.FLOAT_MAT2&&(a=2),s.type===i.FLOAT_MAT3&&(a=3),s.type===i.FLOAT_MAT4&&(a=4),t[o]={type:s.type,location:i.getAttribLocation(e,o),locationSize:a}}return t}function Zr(i){return i!==""}function cu(i,e){const t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return i.replace(/NUM_SUN_LIGHTS/g,e.numSunLights).replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_SUN_LIGHT_SHADOWS/g,e.numSunLightShadows).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows).replace(/NUM_LIGHT_PROBE_GRIDS/g,e.numLightProbeGrids)}function uu(i,e){return i.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const ov=/^[ \t]*#include +<([\w\d./]+)>/gm;function hl(i){return i.replace(ov,av)}function av(i,e){const t=Je[e];if(t===void 0)throw new Error("THREE.WebGLProgram: Can not resolve #include <"+e+">");return hl(t)}const lv=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function hu(i){return i.replace(lv,cv)}function cv(i,e,t,n){let r="";for(let s=parseInt(e);s<parseInt(t);s++)r+=n.replace(/\[\s*i\s*\]/g,"[ "+s+" ]").replace(/UNROLLED_LOOP_INDEX/g,s);return r}function du(i){let e=`precision ${i.precision} float;
	precision ${i.precision} int;
	precision ${i.precision} sampler2D;
	precision ${i.precision} samplerCube;
	precision ${i.precision} sampler3D;
	precision ${i.precision} sampler2DArray;
	precision ${i.precision} sampler2DShadow;
	precision ${i.precision} samplerCubeShadow;
	precision ${i.precision} sampler2DArrayShadow;
	precision ${i.precision} isampler2D;
	precision ${i.precision} isampler3D;
	precision ${i.precision} isamplerCube;
	precision ${i.precision} isampler2DArray;
	precision ${i.precision} usampler2D;
	precision ${i.precision} usampler3D;
	precision ${i.precision} usamplerCube;
	precision ${i.precision} usampler2DArray;
	`;return i.precision==="highp"?e+=`
#define HIGH_PRECISION`:i.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:i.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}const uv={[jr]:"SHADOWMAP_TYPE_PCF",[Yr]:"SHADOWMAP_TYPE_VSM"};function hv(i){return uv[i.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}const dv={[ss]:"ENVMAP_MODE_REFRACTION"};function fv(i){return i.envMap===!1?"ENVMAP_MODE_REFLECTION":dv[i.envMapMode]||"ENVMAP_MODE_REFLECTION"}const pv={[mh]:"ENVMAP_BLENDING_MULTIPLY",[of]:"ENVMAP_BLENDING_MIX",[af]:"ENVMAP_BLENDING_ADD"};function mv(i){return i.envMap===!1?"ENVMAP_BLENDING_NONE":pv[i.combine]||"ENVMAP_BLENDING_NONE"}function gv(i,e,t,n){const r=i.getContext(),s=t.defines;let o=t.vertexShader,a=t.fragmentShader;const l=hv(t),c=t.envMapPMREM===!0?"ENVMAP_TYPE_PMREM":"ENVMAP_TYPE_CUBE",u=fv(t),h=mv(t),d=iv(t),f=rv(s),g=r.createProgram();let v,p,m=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(v=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,f].filter(Zr).join(`
`),v.length>0&&(v+=`
`),p=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,f].filter(Zr).join(`
`),p.length>0&&(p+=`
`)):(v=[du(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,f,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+u:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.diffuseRoughnessMap?"#define USE_DIFFUSE_ROUGHNESSMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.diffuseRoughnessMapUv?"#define DIFFUSE_ROUGHNESSMAP_UV "+t.diffuseRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexNormals?"#define HAS_NORMAL":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Zr).join(`
`),p=[du(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,f,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+c:"",t.envMap?"#define "+u:"",t.envMap?"#define "+h:"",t.envMapPMREM?"#define ENVMAP_MAX_LOD "+t.envMapMaxLod+".0":"",t.envMapPMREM?"#define ENVMAP_SIZE "+t.envMapSize+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.diffuseRoughness?"#define USE_DIFFUSE_ROUGHNESS":"",t.diffuseRoughnessMap?"#define USE_DIFFUSE_ROUGHNESSMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.retroreflection?"#define USE_RETROREFLECTION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor?"#define USE_COLOR":"",t.vertexAlphas||t.batchingColor?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==jn?"#define TONE_MAPPING":"",t.toneMapping!==jn?Je.tonemapping_pars_fragment:"",t.toneMapping!==jn?tv("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",Je.colorspace_pars_fragment,j_("linearToOutputTexel",t.outputColorSpace),nv(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(Zr).join(`
`)),o=hl(o),o=cu(o,t),o=uu(o,t),a=hl(a),a=cu(a,t),a=uu(a,t),o=hu(o),a=hu(a),t.isRawShaderMaterial!==!0&&(m=`#version 300 es
`,v=[d,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+v,p=["#define varying in",t.glslVersion===oc?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===oc?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+p);const x=m+v+o,A=m+p+a,y=ou(r,r.VERTEX_SHADER,x),b=ou(r,r.FRAGMENT_SHADER,A);r.attachShader(g,y),r.attachShader(g,b),t.index0AttributeName!==void 0?r.bindAttribLocation(g,0,t.index0AttributeName):t.hasPositionAttribute===!0&&r.bindAttribLocation(g,0,"position"),r.linkProgram(g);function E(R){if(i.debug.checkShaderErrors){const N=r.getProgramInfoLog(g)||"",O=r.getShaderInfoLog(y)||"",W=r.getShaderInfoLog(b)||"",L=N.trim(),G=O.trim(),z=W.trim();let B=!0,ee=!0;if(r.getProgramParameter(g,r.LINK_STATUS)===!1)if(B=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(r,g,y,b);else{const Y=lu(r,y,"vertex"),Z=lu(r,b,"fragment");Xe("WebGLProgram: Shader Error "+r.getError()+" - VALIDATE_STATUS "+r.getProgramParameter(g,r.VALIDATE_STATUS)+`

Material Name: `+R.name+`
Material Type: `+R.type+`

Program Info Log: `+L+`
`+Y+`
`+Z)}else L!==""?De("WebGLProgram: Program Info Log:",L):(G===""||z==="")&&(ee=!1);ee&&(R.diagnostics={runnable:B,programLog:L,vertexShader:{log:G,prefix:v},fragmentShader:{log:z,prefix:p}})}r.deleteShader(y),r.deleteShader(b),_=new io(r,g),S=sv(r,g)}let _;this.getUniforms=function(){return _===void 0&&E(this),_};let S;this.getAttributes=function(){return S===void 0&&E(this),S};let D=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return D===!1&&(D=r.getProgramParameter(g,$_)),D},this.destroy=function(){n.releaseStatesOfProgram(this),r.deleteProgram(g),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=Z_++,this.cacheKey=e,this.usedTimes=1,this.program=g,this.vertexShader=y,this.fragmentShader=b,this}let _v=0;class vv{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e,t,n){const r=this._getShaderCacheForMaterial(e);return r.has(t)===!1&&(r.add(t),t.usedTimes++),r.has(n)===!1&&(r.add(n),n.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const n of t)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(e),this}getVertexShaderStage(e){return this._getShaderStage(e.vertexShader)}getFragmentShaderStage(e){return this._getShaderStage(e.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){const t=this.shaderCache;let n=t.get(e);return n===void 0&&(n=new xv(e),t.set(e,n)),n}}class xv{constructor(e){this.id=_v++,this.code=e,this.usedTimes=0}}function Mv(i){return i===Oi||i===lo||i===co}function Sv(i,e,t,n,r,s){const o=new Bh,a=new vv,l=new Set,c=[],u=new Map,h=n.logarithmicDepthBuffer,d={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function f(_){return l.add(_),_===0?"uv":`uv${_}`}function g(_,S,D,R,N,O){const W=R.fog,L=N.geometry,G=_.isMeshStandardMaterial||_.isMeshLambertMaterial||_.isMeshPhongMaterial?R.environment:null,z=_.isMeshStandardMaterial||_.isMeshLambertMaterial&&!_.envMap||_.isMeshPhongMaterial&&!_.envMap,B=e.get(_.envMap||G,z),ee=d[_.type];let Y=n.precision;_.precision!==null&&(Y=n.getMaxPrecision(_.precision),Y!==_.precision&&De("WebGLProgram.getParameters:",_.precision,"not supported, using",Y,"instead."));const Z=L.morphAttributes.position||L.morphAttributes.normal||L.morphAttributes.color,te=Z!==void 0?Z.length:0;let ye=0;L.morphAttributes.position!==void 0&&(ye=1),L.morphAttributes.normal!==void 0&&(ye=2),L.morphAttributes.color!==void 0&&(ye=3);let ke,Q,me,Me;if(ee){const de=Nn[ee];ke=de.vertexShader,Q=de.fragmentShader}else{ke=_.vertexShader,Q=_.fragmentShader;const de=a.getVertexShaderStage(_),at=a.getFragmentShaderStage(_);a.update(_,de,at),me=de.id,Me=at.id}const Pe=i.getRenderTarget(),_e=i.state.buffers.depth.getReversed(),Be=N.isInstancedMesh===!0,dt=N.isBatchedMesh===!0,Ce=!!_.map,Ke=!!_.matcap,Ze=!!B,He=Ze&&B.isPMREMTexture===!0,st=!!_.aoMap,et=!!_.lightMap,ot=!!_.bumpMap&&_.wireframe===!1,F=!!_.normalMap,re=!!_.displacementMap,oe=!!_.emissiveMap,Te=!!_.metalnessMap,ze=!!_.roughnessMap,Ge=_.anisotropy>0,U=_.clearcoat>0,Qe=_.diffuseRoughness>0,pt=_.dispersion>0,mt=_.retroreflectivity>0,ve=_.iridescence>0,$e=_.sheen>0,fe=_.transmission>0,Ue=Ge&&!!_.anisotropyMap,w=U&&!!_.clearcoatMap,M=U&&!!_.clearcoatNormalMap,k=U&&!!_.clearcoatRoughnessMap,ie=Qe&&!!_.diffuseRoughnessMap,q=ve&&!!_.iridescenceMap,ne=ve&&!!_.iridescenceThicknessMap,he=$e&&!!_.sheenColorMap,$=$e&&!!_.sheenRoughnessMap,j=!!_.specularMap,ue=!!_.specularColorMap,P=!!_.specularIntensityMap,J=fe&&!!_.transmissionMap,K=fe&&!!_.thicknessMap,le=!!_.gradientMap,ae=!!_.alphaMap,ce=_.alphaTest>0,be=!!_.alphaHash,Ae=!!_.extensions;let se=jn;_.toneMapped&&(Pe===null||Pe.isXRRenderTarget===!0)&&(se=i.toneMapping);const Ie=He?B.isCompressedCubeTexture?B.image[0].mipmaps:B.mipmaps:null,We={shaderID:ee,shaderType:_.type,shaderName:_.name,vertexShader:ke,fragmentShader:Q,defines:_.defines,customVertexShaderID:me,customFragmentShaderID:Me,isRawShaderMaterial:_.isRawShaderMaterial===!0,glslVersion:_.glslVersion,precision:Y,batching:dt,batchingColor:dt&&N._colorsTexture!==null,instancing:Be,instancingColor:Be&&N.instanceColor!==null,instancingMorph:Be&&N.morphTexture!==null,outputColorSpace:Pe===null?i.outputColorSpace:Pe.isXRRenderTarget===!0?Pe.texture.colorSpace:tt.workingColorSpace,alphaToCoverage:!!_.alphaToCoverage,map:Ce,matcap:Ke,envMap:Ze,envMapMode:Ze&&B.mapping,envMapPMREM:He,envMapMaxLod:He?Ie.length-1:null,envMapSize:He?Ie[0].width:null,aoMap:st,lightMap:et,bumpMap:ot,normalMap:F,displacementMap:re,emissiveMap:oe,normalMapObjectSpace:F&&_.normalMapType===df,normalMapTangentSpace:F&&_.normalMapType===uo,packedNormalMap:F&&_.normalMapType===uo&&Mv(_.normalMap.format),metalnessMap:Te,roughnessMap:ze,anisotropy:Ge,anisotropyMap:Ue,clearcoat:U,clearcoatMap:w,clearcoatNormalMap:M,clearcoatRoughnessMap:k,diffuseRoughness:Qe,diffuseRoughnessMap:ie,dispersion:pt,retroreflection:mt,iridescence:ve,iridescenceMap:q,iridescenceThicknessMap:ne,sheen:$e,sheenColorMap:he,sheenRoughnessMap:$,specularMap:j,specularColorMap:ue,specularIntensityMap:P,transmission:fe,transmissionMap:J,thicknessMap:K,gradientMap:le,opaque:_.transparent===!1&&_.blending===es&&_.alphaToCoverage===!1,alphaMap:ae,alphaTest:ce,alphaHash:be,combine:_.combine,mapUv:Ce&&f(_.map.channel),aoMapUv:st&&f(_.aoMap.channel),lightMapUv:et&&f(_.lightMap.channel),bumpMapUv:ot&&f(_.bumpMap.channel),normalMapUv:F&&f(_.normalMap.channel),displacementMapUv:re&&f(_.displacementMap.channel),emissiveMapUv:oe&&f(_.emissiveMap.channel),metalnessMapUv:Te&&f(_.metalnessMap.channel),roughnessMapUv:ze&&f(_.roughnessMap.channel),anisotropyMapUv:Ue&&f(_.anisotropyMap.channel),clearcoatMapUv:w&&f(_.clearcoatMap.channel),clearcoatNormalMapUv:M&&f(_.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:k&&f(_.clearcoatRoughnessMap.channel),diffuseRoughnessMapUv:ie&&f(_.diffuseRoughnessMap.channel),iridescenceMapUv:q&&f(_.iridescenceMap.channel),iridescenceThicknessMapUv:ne&&f(_.iridescenceThicknessMap.channel),sheenColorMapUv:he&&f(_.sheenColorMap.channel),sheenRoughnessMapUv:$&&f(_.sheenRoughnessMap.channel),specularMapUv:j&&f(_.specularMap.channel),specularColorMapUv:ue&&f(_.specularColorMap.channel),specularIntensityMapUv:P&&f(_.specularIntensityMap.channel),transmissionMapUv:J&&f(_.transmissionMap.channel),thicknessMapUv:K&&f(_.thicknessMap.channel),alphaMapUv:ae&&f(_.alphaMap.channel),vertexTangents:!!L.attributes.tangent&&(F||Ge),vertexNormals:!!L.attributes.normal,vertexColors:_.vertexColors,vertexAlphas:_.vertexColors===!0&&!!L.attributes.color&&L.attributes.color.itemSize===4,pointsUvs:N.isPoints===!0&&!!L.attributes.uv&&(Ce||ae),fog:!!W,useFog:_.fog===!0,fogExp2:!!W&&W.isFogExp2,flatShading:_.wireframe===!1&&(_.flatShading===!0||L.attributes.normal===void 0&&F===!1&&(_.isMeshLambertMaterial||_.isMeshPhongMaterial||_.isMeshStandardMaterial||_.isMeshPhysicalMaterial)),sizeAttenuation:_.sizeAttenuation===!0,logarithmicDepthBuffer:h,reversedDepthBuffer:_e,skinning:N.isSkinnedMesh===!0,hasPositionAttribute:L.attributes.position!==void 0,morphTargets:L.morphAttributes.position!==void 0,morphNormals:L.morphAttributes.normal!==void 0,morphColors:L.morphAttributes.color!==void 0,morphTargetsCount:te,morphTextureStride:ye,numSunLights:S.sun.length,numDirLights:S.directional.length,numPointLights:S.point.length,numSpotLights:S.spot.length,numSpotLightMaps:S.spotLightMap.length,numRectAreaLights:S.rectArea.length,numHemiLights:S.hemi.length,numSunLightShadows:S.sunShadowMap.length,numDirLightShadows:S.directionalShadowMap.length,numPointLightShadows:S.pointShadowMap.length,numSpotLightShadows:S.spotShadowMap.length,numSpotLightShadowsWithMaps:S.numSpotLightShadowsWithMaps,numLightProbes:S.numLightProbes,numLightProbeGrids:O.filter(de=>de.texture!==null).length,numClippingPlanes:s.numPlanes,numClipIntersection:s.numIntersection,dithering:_.dithering,shadowMapEnabled:i.shadowMap.enabled&&D.length>0,shadowMapType:i.shadowMap.type,toneMapping:se,decodeVideoTexture:Ce&&_.map.isVideoTexture===!0&&tt.getTransfer(_.map.colorSpace)===gt,decodeVideoTextureEmissive:oe&&_.emissiveMap.isVideoTexture===!0&&tt.getTransfer(_.emissiveMap.colorSpace)===gt,premultipliedAlpha:_.premultipliedAlpha,doubleSided:_.side===jt,flipSided:_.side===Yt,useDepthPacking:_.depthPacking>=0,depthPacking:_.depthPacking||0,index0AttributeName:_.index0AttributeName,extensionClipCullDistance:Ae&&_.extensions.clipCullDistance===!0&&t.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(Ae&&_.extensions.multiDraw===!0||dt)&&t.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:t.has("KHR_parallel_shader_compile"),customProgramCacheKey:_.customProgramCacheKey()};return We.vertexUv1s=l.has(1),We.vertexUv2s=l.has(2),We.vertexUv3s=l.has(3),l.clear(),We}function v(_){const S=[];if(_.shaderID?S.push(_.shaderID):(S.push(_.customVertexShaderID),S.push(_.customFragmentShaderID)),_.defines!==void 0)for(const D in _.defines)S.push(D),S.push(_.defines[D]);return _.isRawShaderMaterial===!1&&(p(S,_),m(S,_),S.push(i.outputColorSpace)),S.push(_.customProgramCacheKey),S.join()}function p(_,S){_.push(S.precision),_.push(S.outputColorSpace),_.push(S.envMapMode),_.push(S.envMapPMREM),_.push(S.envMapMaxLod),_.push(S.envMapSize),_.push(S.mapUv),_.push(S.alphaMapUv),_.push(S.lightMapUv),_.push(S.aoMapUv),_.push(S.bumpMapUv),_.push(S.normalMapUv),_.push(S.displacementMapUv),_.push(S.emissiveMapUv),_.push(S.metalnessMapUv),_.push(S.roughnessMapUv),_.push(S.anisotropyMapUv),_.push(S.clearcoatMapUv),_.push(S.clearcoatNormalMapUv),_.push(S.clearcoatRoughnessMapUv),_.push(S.diffuseRoughnessMapUv),_.push(S.iridescenceMapUv),_.push(S.iridescenceThicknessMapUv),_.push(S.sheenColorMapUv),_.push(S.sheenRoughnessMapUv),_.push(S.specularMapUv),_.push(S.specularColorMapUv),_.push(S.specularIntensityMapUv),_.push(S.transmissionMapUv),_.push(S.thicknessMapUv),_.push(S.combine),_.push(S.fogExp2),_.push(S.sizeAttenuation),_.push(S.morphTargetsCount),_.push(S.numSunLights),_.push(S.numDirLights),_.push(S.numPointLights),_.push(S.numSpotLights),_.push(S.numSpotLightMaps),_.push(S.numHemiLights),_.push(S.numRectAreaLights),_.push(S.numSunLightShadows),_.push(S.numDirLightShadows),_.push(S.numPointLightShadows),_.push(S.numSpotLightShadows),_.push(S.numSpotLightShadowsWithMaps),_.push(S.numLightProbes),_.push(S.numLightProbeGrids),_.push(S.shadowMapType),_.push(S.toneMapping),_.push(S.numClippingPlanes),_.push(S.numClipIntersection),_.push(S.depthPacking)}function m(_,S){o.disableAll(),S.instancing&&o.enable(0),S.instancingColor&&o.enable(1),S.instancingMorph&&o.enable(2),S.matcap&&o.enable(3),S.envMap&&o.enable(4),S.normalMapObjectSpace&&o.enable(5),S.normalMapTangentSpace&&o.enable(6),S.clearcoat&&o.enable(7),S.iridescence&&o.enable(8),S.alphaTest&&o.enable(9),S.vertexColors&&o.enable(10),S.vertexAlphas&&o.enable(11),S.vertexUv1s&&o.enable(12),S.vertexUv2s&&o.enable(13),S.vertexUv3s&&o.enable(14),S.vertexTangents&&o.enable(15),S.anisotropy&&o.enable(16),S.alphaHash&&o.enable(17),S.batching&&o.enable(18),S.dispersion&&o.enable(19),S.retroreflection&&o.enable(24),S.diffuseRoughness&&o.enable(25),S.batchingColor&&o.enable(20),S.gradientMap&&o.enable(21),S.packedNormalMap&&o.enable(22),S.vertexNormals&&o.enable(23),_.push(o.mask),o.disableAll(),S.fog&&o.enable(0),S.useFog&&o.enable(1),S.flatShading&&o.enable(2),S.logarithmicDepthBuffer&&o.enable(3),S.reversedDepthBuffer&&o.enable(4),S.skinning&&o.enable(5),S.morphTargets&&o.enable(6),S.morphNormals&&o.enable(7),S.morphColors&&o.enable(8),S.premultipliedAlpha&&o.enable(9),S.shadowMapEnabled&&o.enable(10),S.doubleSided&&o.enable(11),S.flipSided&&o.enable(12),S.useDepthPacking&&o.enable(13),S.dithering&&o.enable(14),S.transmission&&o.enable(15),S.sheen&&o.enable(16),S.opaque&&o.enable(17),S.pointsUvs&&o.enable(18),S.decodeVideoTexture&&o.enable(19),S.decodeVideoTextureEmissive&&o.enable(20),S.alphaToCoverage&&o.enable(21),S.numLightProbeGrids>0&&o.enable(22),S.hasPositionAttribute&&o.enable(23),_.push(o.mask)}function x(_){const S=d[_.type];let D;if(S){const R=Nn[S];D=$h.clone(R.uniforms)}else D=_.uniforms;return D}function A(_,S){let D=u.get(S);return D!==void 0?++D.usedTimes:(D=new gv(i,S,_,r),c.push(D),u.set(S,D)),D}function y(_){if(--_.usedTimes===0){const S=c.indexOf(_);c[S]=c[c.length-1],c.pop(),u.delete(_.cacheKey),_.destroy()}}function b(_){a.remove(_)}function E(){a.dispose()}return{getParameters:g,getProgramCacheKey:v,getUniforms:x,acquireProgram:A,releaseProgram:y,releaseShaderCache:b,programs:c,dispose:E}}function yv(){let i=new WeakMap;function e(o){return i.has(o)}function t(o){let a=i.get(o);return a===void 0&&(a={},i.set(o,a)),a}function n(o){i.delete(o)}function r(o,a,l){i.get(o)[a]=l}function s(){i=new WeakMap}return{has:e,get:t,remove:n,update:r,dispose:s}}function Tv(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.material.id!==e.material.id?i.material.id-e.material.id:i.materialVariant!==e.materialVariant?i.materialVariant-e.materialVariant:i.z!==e.z?i.z-e.z:i.id-e.id}function fu(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.z!==e.z?e.z-i.z:i.id-e.id}function pu(){const i=[];let e=0;const t=[],n=[],r=[];function s(){e=0,t.length=0,n.length=0,r.length=0}function o(d){let f=0;return d.isInstancedMesh&&(f+=2),d.isSkinnedMesh&&(f+=1),f}function a(d,f,g,v,p,m){let x=i[e];return x===void 0?(x={id:d.id,object:d,geometry:f,material:g,materialVariant:o(d),groupOrder:v,renderOrder:d.renderOrder,z:p,group:m},i[e]=x):(x.id=d.id,x.object=d,x.geometry=f,x.material=g,x.materialVariant=o(d),x.groupOrder=v,x.renderOrder=d.renderOrder,x.z=p,x.group=m),e++,x}function l(d,f,g,v,p,m,x){x.reversedDepth===!0&&(p=-p);const A=a(d,f,g,v,p,m);g.transmission>0?n.push(A):g.transparent===!0?r.push(A):t.push(A)}function c(d,f,g,v,p,m){const x=a(d,f,g,v,p,m);g.transmission>0?n.unshift(x):g.transparent===!0?r.unshift(x):t.unshift(x)}function u(d,f){t.length>1&&t.sort(d||Tv),n.length>1&&n.sort(f||fu),r.length>1&&r.sort(f||fu)}function h(){for(let d=e,f=i.length;d<f;d++){const g=i[d];if(g.id===null)break;g.id=null,g.object=null,g.geometry=null,g.material=null,g.group=null}}return{opaque:t,transmissive:n,transparent:r,init:s,push:l,unshift:c,finish:h,sort:u}}function Ev(){let i=new WeakMap;function e(n,r){const s=i.get(n);let o;return s===void 0?(o=new pu,i.set(n,[o])):r>=s.length?(o=new pu,s.push(o)):o=s[r],o}function t(){i=new WeakMap}return{get:e,dispose:t}}function bv(){const i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"SunLight":case"DirectionalLight":t={direction:new C,color:new Ne};break;case"SpotLight":t={position:new C,direction:new C,color:new Ne,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new C,color:new Ne,distance:0,decay:0};break;case"HemisphereLight":t={direction:new C,skyColor:new Ne,groundColor:new Ne};break;case"RectAreaLight":t={color:new Ne,position:new C,halfWidth:new C,halfHeight:new C};break}return i[e.id]=t,t}}}function Av(){const i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"SunLight":case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ye};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ye};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ye,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[e.id]=t,t}}}let wv=0;function Rv(i,e){return(e.castShadow?2:0)-(i.castShadow?2:0)+(e.map?1:0)-(i.map?1:0)}function Cv(i){const e=new bv,t=Av(),n={version:0,hash:{sunLength:-1,directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numSunShadows:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],sun:[],sunShadow:[],sunShadowMap:[],sunShadowMatrix:[],sunShadowCascade:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)n.probe.push(new C);const r=new C,s=new Ve,o=new Ve;function a(c){let u=0,h=0,d=0;for(let O=0;O<9;O++)n.probe[O].set(0,0,0);let f=0,g=0,v=0,p=0,m=0,x=0,A=0,y=0,b=0,E=0,_=0,S=0,D=0,R=0;c.sort(Rv);for(let O=0,W=c.length;O<W;O++){const L=c[O],G=L.color,z=L.intensity,B=L.distance;let ee=null;if(L.shadow&&L.shadow.map&&(L.shadow.map.texture.format===Oi?ee=L.shadow.map.texture:ee=L.shadow.map.depthTexture||L.shadow.map.texture),L.isAmbientLight)u+=G.r*z,h+=G.g*z,d+=G.b*z;else if(L.isLightProbe){for(let Y=0;Y<9;Y++)n.probe[Y].addScaledVector(L.sh.coefficients[Y],z);R++}else if(L.isSunLight){const Y=e.get(L);if(Y.color.copy(L.color).multiplyScalar(L.intensity),L.castShadow){const Z=L.shadow,te=t.get(L);te.shadowIntensity=Z.intensity,te.shadowBias=Z.bias,te.shadowNormalBias=Z.normalBias,te.shadowRadius=Z.radius,te.shadowMapSize.copy(Z.mapSize).multiply(Z.getFrameExtents()),n.sunShadow[g]=te,n.sunShadowMap[g]=ee;const ye=Z.getViewportCount();for(let ke=0;ke<ye;ke++)n.sunShadowMatrix[v+ke]=Z.getMatrix(ke),n.sunShadowCascade[v+ke]=Z._cascadeData[ke];v+=ye,g++}n.sun[f]=Y,f++}else if(L.isDirectionalLight){const Y=e.get(L);if(Y.color.copy(L.color).multiplyScalar(L.intensity),L.castShadow){const Z=L.shadow,te=t.get(L);te.shadowIntensity=Z.intensity,te.shadowBias=Z.bias,te.shadowNormalBias=Z.normalBias,te.shadowRadius=Z.radius,te.shadowMapSize=Z.mapSize,n.directionalShadow[p]=te,n.directionalShadowMap[p]=ee,n.directionalShadowMatrix[p]=L.shadow.matrix,b++}n.directional[p]=Y,p++}else if(L.isSpotLight){const Y=e.get(L);Y.position.setFromMatrixPosition(L.matrixWorld),Y.color.copy(G).multiplyScalar(z),Y.distance=B,Y.coneCos=Math.cos(L.angle),Y.penumbraCos=Math.cos(L.angle*(1-L.penumbra)),Y.decay=L.decay,n.spot[x]=Y;const Z=L.shadow;if(L.map&&(n.spotLightMap[S]=L.map,S++,Z.updateMatrices(L),L.castShadow&&D++),n.spotLightMatrix[x]=Z.matrix,L.castShadow){const te=t.get(L);te.shadowIntensity=Z.intensity,te.shadowBias=Z.bias,te.shadowNormalBias=Z.normalBias,te.shadowRadius=Z.radius,te.shadowMapSize=Z.mapSize,n.spotShadow[x]=te,n.spotShadowMap[x]=ee,_++}x++}else if(L.isRectAreaLight){const Y=e.get(L);Y.color.copy(G).multiplyScalar(z),Y.halfWidth.set(L.width*.5,0,0),Y.halfHeight.set(0,L.height*.5,0),n.rectArea[A]=Y,A++}else if(L.isPointLight){const Y=e.get(L);if(Y.color.copy(L.color).multiplyScalar(L.intensity),Y.distance=L.distance,Y.decay=L.decay,L.castShadow){const Z=L.shadow,te=t.get(L);te.shadowIntensity=Z.intensity,te.shadowBias=Z.bias,te.shadowNormalBias=Z.normalBias,te.shadowRadius=Z.radius,te.shadowMapSize=Z.mapSize,te.shadowCameraNear=Z.camera.near,te.shadowCameraFar=Z.camera.far,n.pointShadow[m]=te,n.pointShadowMap[m]=ee,n.pointShadowMatrix[m]=L.shadow.matrix,E++}n.point[m]=Y,m++}else if(L.isHemisphereLight){const Y=e.get(L);Y.skyColor.copy(L.color).multiplyScalar(z),Y.groundColor.copy(L.groundColor).multiplyScalar(z),n.hemi[y]=Y,y++}}A>0&&(i.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=xe.LTC_FLOAT_1,n.rectAreaLTC2=xe.LTC_FLOAT_2):(n.rectAreaLTC1=xe.LTC_HALF_1,n.rectAreaLTC2=xe.LTC_HALF_2)),n.ambient[0]=u,n.ambient[1]=h,n.ambient[2]=d;const N=n.hash;(N.sunLength!==f||N.directionalLength!==p||N.pointLength!==m||N.spotLength!==x||N.rectAreaLength!==A||N.hemiLength!==y||N.numSunShadows!==g||N.numDirectionalShadows!==b||N.numPointShadows!==E||N.numSpotShadows!==_||N.numSpotMaps!==S||N.numLightProbes!==R)&&(n.sun.length=f,n.directional.length=p,n.spot.length=x,n.rectArea.length=A,n.point.length=m,n.hemi.length=y,n.sunShadow.length=g,n.sunShadowMap.length=g,n.sunShadowMatrix.length=v,n.sunShadowCascade.length=v,n.directionalShadow.length=b,n.directionalShadowMap.length=b,n.directionalShadowMatrix.length=b,n.pointShadow.length=E,n.pointShadowMap.length=E,n.pointShadowMatrix.length=E,n.spotShadow.length=_,n.spotShadowMap.length=_,n.spotLightMatrix.length=_+S-D,n.spotLightMap.length=S,n.numSpotLightShadowsWithMaps=D,n.numLightProbes=R,N.sunLength=f,N.directionalLength=p,N.pointLength=m,N.spotLength=x,N.rectAreaLength=A,N.hemiLength=y,N.numSunShadows=g,N.numDirectionalShadows=b,N.numPointShadows=E,N.numSpotShadows=_,N.numSpotMaps=S,N.numLightProbes=R,n.version=wv++)}function l(c,u){let h=0,d=0,f=0,g=0,v=0,p=0;const m=u.matrixWorldInverse;for(let x=0,A=c.length;x<A;x++){const y=c[x];if(y.isSunLight){const b=n.sun[h];b.direction.setFromMatrixPosition(y.matrixWorld),b.direction.transformDirection(m),h++}else if(y.isDirectionalLight){const b=n.directional[d];b.direction.setFromMatrixPosition(y.matrixWorld),r.setFromMatrixPosition(y.target.matrixWorld),b.direction.sub(r),b.direction.transformDirection(m),d++}else if(y.isSpotLight){const b=n.spot[g];b.position.setFromMatrixPosition(y.matrixWorld),b.position.applyMatrix4(m),b.direction.setFromMatrixPosition(y.matrixWorld),r.setFromMatrixPosition(y.target.matrixWorld),b.direction.sub(r),b.direction.transformDirection(m),g++}else if(y.isRectAreaLight){const b=n.rectArea[v];b.position.setFromMatrixPosition(y.matrixWorld),b.position.applyMatrix4(m),o.identity(),s.copy(y.matrixWorld),s.premultiply(m),o.extractRotation(s),b.halfWidth.set(y.width*.5,0,0),b.halfHeight.set(0,y.height*.5,0),b.halfWidth.applyMatrix4(o),b.halfHeight.applyMatrix4(o),v++}else if(y.isPointLight){const b=n.point[f];b.position.setFromMatrixPosition(y.matrixWorld),b.position.applyMatrix4(m),f++}else if(y.isHemisphereLight){const b=n.hemi[p];b.direction.setFromMatrixPosition(y.matrixWorld),b.direction.transformDirection(m),p++}}}return{setup:a,setupView:l,state:n}}function mu(i){const e=new Cv(i),t=[],n=[],r=[];function s(h){u.camera=h,t.length=0,n.length=0,r.length=0}function o(h){h.isLightProbeGrid?r.push(h):t.push(h)}function a(h){n.push(h)}function l(){e.setup(t),r.sort((h,d)=>h.priority-d.priority||h.id-d.id)}function c(h){e.setupView(t,h)}const u={lightsArray:t,shadowsArray:n,lightProbeGridArray:r,camera:null,lights:e,transmissionRenderTarget:{},textureUnits:0};return{init:s,state:u,setupLights:l,setupLightsView:c,pushLight:o,pushShadow:a}}function Pv(i){let e=new WeakMap;function t(r,s=0){const o=e.get(r);let a;return o===void 0?(a=new mu(i),e.set(r,[a])):s>=o.length?(a=new mu(i),o.push(a)):a=o[s],a}function n(){e=new WeakMap}return{get:t,dispose:n}}const Lv=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,Iv=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,Nv=[new C(1,0,0),new C(-1,0,0),new C(0,1,0),new C(0,-1,0),new C(0,0,1),new C(0,0,-1)],Dv=[new C(0,-1,0),new C(0,-1,0),new C(0,0,1),new C(0,0,-1),new C(0,-1,0),new C(0,-1,0)],gu=new Ve,kr=new C,oa=new C;function Uv(i,e,t){let n=new hs;const r=new Ye,s=new Ye,o=new xt,a=new v0,l=new x0,c={},u=t.maxTextureSize,h={[gi]:Yt,[Yt]:gi,[jt]:jt},d=new xi({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new Ye},radius:{value:4}},vertexShader:Lv,fragmentShader:Iv}),f=d.clone();f.defines.HORIZONTAL_PASS=1;const g=new Et;g.setAttribute("position",new vt(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const v=new wt(g,d),p=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=jr;let m=this.type;this.render=function(E,_,S){if(p.enabled===!1||p.autoUpdate===!1&&p.needsUpdate===!1||E.length===0)return;this.type===Vd&&(De("WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead."),this.type=jr);const D=i.getRenderTarget(),R=i.getActiveCubeFace(),N=i.getActiveMipmapLevel(),O=i.state;O.setBlending(hr),O.buffers.depth.getReversed()===!0?O.buffers.color.setClear(0,0,0,0):O.buffers.color.setClear(1,1,1,1),O.buffers.depth.setTest(!0),O.setScissorTest(!1);const W=m!==this.type;W&&_.traverse(function(L){L.material&&(Array.isArray(L.material)?L.material.forEach(G=>G.needsUpdate=!0):L.material.needsUpdate=!0)});for(let L=0,G=E.length;L<G;L++){const z=E[L],B=z.shadow;if(B===void 0){De("WebGLShadowMap:",z,"has no shadow.");continue}if(B.autoUpdate===!1&&B.needsUpdate===!1)continue;r.copy(B.mapSize);const ee=B.getFrameExtents();r.multiply(ee),s.copy(B.mapSize),(r.x>u||r.y>u)&&(r.x>u&&(s.x=Math.floor(u/ee.x),r.x=s.x*ee.x,B.mapSize.x=s.x),r.y>u&&(s.y=Math.floor(u/ee.y),r.y=s.y*ee.y,B.mapSize.y=s.y));const Y=i.state.buffers.depth.getReversed();if(B.camera._reversedDepth=Y,B.map===null||W===!0){if(B.map!==null&&(B.map.depthTexture!==null&&(B.map.depthTexture.dispose(),B.map.depthTexture=null),B.map.dispose()),this.type===Yr){if(z.isPointLight){De("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}B.map=new On(r.x,r.y,{format:Oi,type:Bn,minFilter:Bt,magFilter:Bt,generateMipmaps:!1}),B.map.texture.name=z.name+".shadowMap",B.map.depthTexture=new xr(r.x,r.y,ln),B.map.depthTexture.name=z.name+".shadowMapDepth",B.map.depthTexture.format=vi,B.map.depthTexture.compareFunction=null,B.map.depthTexture.minFilter=It,B.map.depthTexture.magFilter=It}else z.isPointLight?(B.map=new Hl(r.x),B.map.depthTexture=new qh(r.x,Fn)):(B.map=new On(r.x,r.y),B.map.depthTexture=new xr(r.x,r.y,Fn)),B.map.depthTexture.name=z.name+".shadowMap",B.map.depthTexture.format=vi,this.type===jr?(B.map.depthTexture.compareFunction=Y?Ih:Lh,B.map.depthTexture.minFilter=Bt,B.map.depthTexture.magFilter=Bt):(B.map.depthTexture.compareFunction=null,B.map.depthTexture.minFilter=It,B.map.depthTexture.magFilter=It);B.camera.updateProjectionMatrix()}B.map.isWebGLCubeRenderTarget!==!0&&(B.map.width!==r.x||B.map.height!==r.y)&&B.map.setSize(r.x,r.y);const Z=B.map.isWebGLCubeRenderTarget?6:B.getViewportCount();z.isPointLight!==!0&&B.updateMatrices(z,S);const te=(B.camera.layers.mask&4294967294)!==0?B.camera.layers:S.layers;for(let ye=0;ye<Z;ye++){const ke=B.getCamera(ye);if(z.isPointLight){const Q=B.camera,me=B.matrix,Me=z.distance||Q.far;Me!==Q.far&&(Q.far=Me,Q.updateProjectionMatrix()),kr.setFromMatrixPosition(z.matrixWorld),Q.position.copy(kr),oa.copy(Q.position),oa.add(Nv[ye]),Q.up.copy(Dv[ye]),Q.lookAt(oa),Q.updateMatrixWorld(),me.makeTranslation(-kr.x,-kr.y,-kr.z),gu.multiplyMatrices(Q.projectionMatrix,Q.matrixWorldInverse),B._frustum.setFromProjectionMatrix(gu,Q.coordinateSystem,Q.reversedDepth)}if(B.map.isWebGLCubeRenderTarget)i.setRenderTarget(B.map,ye),i.clear();else{ye===0&&(i.setRenderTarget(B.map),i.clear());const Q=B.getViewport(ye);o.set(s.x*Q.x,s.y*Q.y,s.x*Q.z,s.y*Q.w),O.viewport(o)}n=B.getFrustum(ye),y(_,S,ke,z,te,this.type)}B.isPointLightShadow!==!0&&this.type===Yr&&x(B,S),B.needsUpdate=!1}m=this.type,p.needsUpdate=!1,i.setRenderTarget(D,R,N)};function x(E,_){const S=e.update(v);d.defines.VSM_SAMPLES!==E.blurSamples&&(d.defines.VSM_SAMPLES=E.blurSamples,f.defines.VSM_SAMPLES=E.blurSamples,d.needsUpdate=!0,f.needsUpdate=!0),E.mapPass===null?E.mapPass=new On(r.x,r.y,{format:Oi,type:Bn}):(E.mapPass.width!==E.map.width||E.mapPass.height!==E.map.height)&&E.mapPass.setSize(E.map.width,E.map.height),d.uniforms.shadow_pass.value=E.map.depthTexture,d.uniforms.resolution.value.set(E.map.width,E.map.height),d.uniforms.radius.value=E.radius,i.setRenderTarget(E.mapPass),i.clear(),i.renderBufferDirect(_,null,S,d,v,null),f.uniforms.shadow_pass.value=E.mapPass.texture,f.uniforms.resolution.value.set(E.map.width,E.map.height),f.uniforms.radius.value=E.radius,i.setRenderTarget(E.map),i.clear(),i.renderBufferDirect(_,null,S,f,v,null)}function A(E,_,S,D){let R=null;const N=S.isPointLight===!0?E.customDistanceMaterial:E.customDepthMaterial;if(N!==void 0)R=N;else if(R=S.isPointLight===!0?l:a,i.localClippingEnabled&&_.clipShadows===!0&&Array.isArray(_.clippingPlanes)&&_.clippingPlanes.length!==0||_.displacementMap&&_.displacementScale!==0||_.alphaMap&&_.alphaTest>0||_.map&&_.alphaTest>0||_.alphaToCoverage===!0){const O=R.uuid,W=_.uuid;let L=c[O];L===void 0&&(L={},c[O]=L);let G=L[W];G===void 0&&(G=R.clone(),L[W]=G,_.addEventListener("dispose",b)),R=G}if(R.visible=_.visible,R.wireframe=_.wireframe,D===Yr?R.side=_.shadowSide!==null?_.shadowSide:_.side:R.side=_.shadowSide!==null?_.shadowSide:h[_.side],R.alphaMap=_.alphaMap,R.alphaTest=_.alphaToCoverage===!0?.5:_.alphaTest,R.map=_.map,R.clipShadows=_.clipShadows,R.clippingPlanes=_.clippingPlanes,R.clipIntersection=_.clipIntersection,R.displacementMap=_.displacementMap,R.displacementScale=_.displacementScale,R.displacementBias=_.displacementBias,R.wireframeLinewidth=_.wireframeLinewidth,R.linewidth=_.linewidth,S.isPointLight===!0&&R.isMeshDistanceMaterial===!0){const O=i.properties.get(R);O.light=S}return R}function y(E,_,S,D,R,N){if(E.visible===!1)return;if(E.layers.test(R)&&(E.isMesh||E.isLine||E.isPoints)&&(E.castShadow||E.receiveShadow&&N===Yr)&&(!E.frustumCulled||E.intersectsFrustum(n))){E.modelViewMatrix.multiplyMatrices(S.matrixWorldInverse,E.matrixWorld);const L=e.update(E),G=E.material;if(Array.isArray(G)){const z=L.groups;for(let B=0,ee=z.length;B<ee;B++){const Y=z[B],Z=G[Y.materialIndex];if(Z&&Z.visible){const te=A(E,Z,D,N);E.onBeforeShadow(i,E,_,S,L,te,Y),i.renderBufferDirect(S,null,L,te,E,Y),E.onAfterShadow(i,E,_,S,L,te,Y)}}}else if(G.visible){const z=A(E,G,D,N);E.onBeforeShadow(i,E,_,S,L,z,null),i.renderBufferDirect(S,null,L,z,E,null),E.onAfterShadow(i,E,_,S,L,z,null)}}const W=E.children;for(let L=0,G=W.length;L<G;L++)y(W[L],_,S,D,R,N)}function b(E){E.target.removeEventListener("dispose",b);for(const S in c){const D=c[S],R=E.target.uuid;R in D&&(D[R].dispose(),delete D[R])}}}function Ov(i,e){function t(){let P=!1;const J=new xt;let K=null;const le=new xt(0,0,0,0);return{setMask:function(ae){K!==ae&&!P&&(i.colorMask(ae,ae,ae,ae),K=ae)},setLocked:function(ae){P=ae},setClear:function(ae,ce,be,Ae,se){se===!0&&(ae*=Ae,ce*=Ae,be*=Ae),J.set(ae,ce,be,Ae),le.equals(J)===!1&&(i.clearColor(ae,ce,be,Ae),le.copy(J))},reset:function(){P=!1,K=null,le.set(-1,0,0,0)}}}function n(){let P=!1,J=!1,K=null,le=null,ae=null;return{setReversed:function(ce){if(J!==ce){const be=e.get("EXT_clip_control");ce?be.clipControlEXT(be.LOWER_LEFT_EXT,be.ZERO_TO_ONE_EXT):be.clipControlEXT(be.LOWER_LEFT_EXT,be.NEGATIVE_ONE_TO_ONE_EXT),J=ce;const Ae=ae;ae=null,this.setClear(Ae)}},getReversed:function(){return J},setTest:function(ce){ce?_e(i.DEPTH_TEST):Be(i.DEPTH_TEST)},setMask:function(ce){K!==ce&&!P&&(i.depthMask(ce),K=ce)},setFunc:function(ce){if(J&&(ce=Ef[ce]),le!==ce){switch(ce){case Ea:i.depthFunc(i.NEVER);break;case ba:i.depthFunc(i.ALWAYS);break;case Aa:i.depthFunc(i.LESS);break;case rs:i.depthFunc(i.LEQUAL);break;case wa:i.depthFunc(i.EQUAL);break;case Ra:i.depthFunc(i.GEQUAL);break;case Ca:i.depthFunc(i.GREATER);break;case Pa:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}le=ce}},setLocked:function(ce){P=ce},setClear:function(ce){ae!==ce&&(ae=ce,J&&(ce=1-ce),i.clearDepth(ce))},reset:function(){P=!1,K=null,le=null,ae=null,J=!1}}}function r(){let P=!1,J=null,K=null,le=null,ae=null,ce=null,be=null,Ae=null,se=null;return{setTest:function(Ie){P||(Ie?_e(i.STENCIL_TEST):Be(i.STENCIL_TEST))},setMask:function(Ie){J!==Ie&&!P&&(i.stencilMask(Ie),J=Ie)},setFunc:function(Ie,We,de){(K!==Ie||le!==We||ae!==de)&&(i.stencilFunc(Ie,We,de),K=Ie,le=We,ae=de)},setOp:function(Ie,We,de){(ce!==Ie||be!==We||Ae!==de)&&(i.stencilOp(Ie,We,de),ce=Ie,be=We,Ae=de)},setLocked:function(Ie){P=Ie},setClear:function(Ie){se!==Ie&&(i.clearStencil(Ie),se=Ie)},reset:function(){P=!1,J=null,K=null,le=null,ae=null,ce=null,be=null,Ae=null,se=null}}}const s=new t,o=new n,a=new r;let l={};const c=new WeakMap;let u={},h={},d={},f=new WeakMap,g=[],v=null,p=!1,m=null,x=null,A=null,y=null,b=null,E=null,_=null,S=new Ne(0,0,0),D=0,R=!1,N=null,O=null,W=null,L=null,G=null;const z=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let B=!1,ee=0;const Y=i.getParameter(i.VERSION);Y.indexOf("WebGL")!==-1?(ee=parseFloat(/^WebGL (\d)/.exec(Y)[1]),B=ee>=1):Y.indexOf("OpenGL ES")!==-1&&(ee=parseFloat(/^OpenGL ES (\d)/.exec(Y)[1]),B=ee>=2);let Z=null,te={};const ye=i.getParameter(i.SCISSOR_BOX),ke=i.getParameter(i.VIEWPORT),Q=new xt().fromArray(ye),me=new xt().fromArray(ke);function Me(P,J,K,le){const ae=new Uint8Array(4),ce=i.createTexture();i.bindTexture(P,ce),i.texParameteri(P,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(P,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let be=0;be<K;be++)P===i.TEXTURE_3D||P===i.TEXTURE_2D_ARRAY?i.texImage3D(J,0,i.RGBA,1,1,le,0,i.RGBA,i.UNSIGNED_BYTE,ae):i.texImage2D(J+be,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,ae);return ce}const Pe={};Pe[i.TEXTURE_2D]=Me(i.TEXTURE_2D,i.TEXTURE_2D,1),Pe[i.TEXTURE_CUBE_MAP]=Me(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),Pe[i.TEXTURE_2D_ARRAY]=Me(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),Pe[i.TEXTURE_3D]=Me(i.TEXTURE_3D,i.TEXTURE_3D,1,1),s.setClear(0,0,0,1),o.setClear(1),a.setClear(0),_e(i.DEPTH_TEST),o.setFunc(rs),ot(!1),F(Jl),_e(i.CULL_FACE),st(hr);function _e(P){u[P]!==!0&&(i.enable(P),u[P]=!0)}function Be(P){u[P]!==!1&&(i.disable(P),u[P]=!1)}function dt(P,J){return d[P]!==J?(i.bindFramebuffer(P,J),d[P]=J,P===i.DRAW_FRAMEBUFFER&&(d[i.FRAMEBUFFER]=J),P===i.FRAMEBUFFER&&(d[i.DRAW_FRAMEBUFFER]=J),!0):!1}function Ce(P,J){let K=g,le=!1;if(P){K=f.get(J),K===void 0&&(K=[],f.set(J,K));const ae=P.textures;if(K.length!==ae.length||K[0]!==i.COLOR_ATTACHMENT0){for(let ce=0,be=ae.length;ce<be;ce++)K[ce]=i.COLOR_ATTACHMENT0+ce;K.length=ae.length,le=!0}}else K[0]!==i.BACK&&(K[0]=i.BACK,le=!0);le&&i.drawBuffers(K)}function Ke(P){return v!==P?(i.useProgram(P),v=P,!0):!1}const Ze={[ar]:i.FUNC_ADD,[zd]:i.FUNC_SUBTRACT,[Gd]:i.FUNC_REVERSE_SUBTRACT};Ze[Wd]=i.MIN,Ze[Xd]=i.MAX;const He={[qd]:i.ZERO,[Yd]:i.ONE,[Kd]:i.SRC_COLOR,[fh]:i.SRC_ALPHA,[ef]:i.SRC_ALPHA_SATURATE,[Qd]:i.DST_COLOR,[Zd]:i.DST_ALPHA,[$d]:i.ONE_MINUS_SRC_COLOR,[ph]:i.ONE_MINUS_SRC_ALPHA,[jd]:i.ONE_MINUS_DST_COLOR,[Jd]:i.ONE_MINUS_DST_ALPHA,[tf]:i.CONSTANT_COLOR,[nf]:i.ONE_MINUS_CONSTANT_COLOR,[rf]:i.CONSTANT_ALPHA,[sf]:i.ONE_MINUS_CONSTANT_ALPHA};function st(P,J,K,le,ae,ce,be,Ae,se,Ie){if(P===hr){p===!0&&(Be(i.BLEND),p=!1);return}if(p===!1&&(_e(i.BLEND),p=!0),P!==Hd){if(P!==m||Ie!==R){if((x!==ar||b!==ar)&&(i.blendEquation(i.FUNC_ADD),x=ar,b=ar),Ie)switch(P){case es:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case Ql:i.blendFunc(i.ONE,i.ONE);break;case jl:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case ec:i.blendFuncSeparate(i.DST_COLOR,i.ONE_MINUS_SRC_ALPHA,i.ZERO,i.ONE);break;default:Xe("WebGLState: Invalid blending: ",P);break}else switch(P){case es:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case Ql:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE,i.ONE,i.ONE);break;case jl:Xe("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case ec:Xe("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:Xe("WebGLState: Invalid blending: ",P);break}A=null,y=null,E=null,_=null,S.set(0,0,0),D=0,m=P,R=Ie}return}ae=ae||J,ce=ce||K,be=be||le,(J!==x||ae!==b)&&(i.blendEquationSeparate(Ze[J],Ze[ae]),x=J,b=ae),(K!==A||le!==y||ce!==E||be!==_)&&(i.blendFuncSeparate(He[K],He[le],He[ce],He[be]),A=K,y=le,E=ce,_=be),(Ae.equals(S)===!1||se!==D)&&(i.blendColor(Ae.r,Ae.g,Ae.b,se),S.copy(Ae),D=se),m=P,R=!1}function et(P,J){P.side===jt?Be(i.CULL_FACE):_e(i.CULL_FACE);let K=P.side===Yt;J&&(K=!K),ot(K),P.blending===es&&P.transparent===!1?st(hr):st(P.blending,P.blendEquation,P.blendSrc,P.blendDst,P.blendEquationAlpha,P.blendSrcAlpha,P.blendDstAlpha,P.blendColor,P.blendAlpha,P.premultipliedAlpha),o.setFunc(P.depthFunc),o.setTest(P.depthTest),o.setMask(P.depthWrite),s.setMask(P.colorWrite);const le=P.stencilWrite;a.setTest(le),le&&(a.setMask(P.stencilWriteMask),a.setFunc(P.stencilFunc,P.stencilRef,P.stencilFuncMask),a.setOp(P.stencilFail,P.stencilZFail,P.stencilZPass)),oe(P.polygonOffset,P.polygonOffsetFactor,P.polygonOffsetUnits),P.alphaToCoverage===!0?_e(i.SAMPLE_ALPHA_TO_COVERAGE):Be(i.SAMPLE_ALPHA_TO_COVERAGE)}function ot(P){N!==P&&(P?i.frontFace(i.CW):i.frontFace(i.CCW),N=P)}function F(P){P!==Bd?(_e(i.CULL_FACE),P!==O&&(P===Jl?i.cullFace(i.BACK):P===kd?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):Be(i.CULL_FACE),O=P}function re(P){P!==W&&(B&&i.lineWidth(P),W=P)}function oe(P,J,K){P?(_e(i.POLYGON_OFFSET_FILL),(L!==J||G!==K)&&(L=J,G=K,o.getReversed()&&(J=-J,K=-K),i.polygonOffset(J,K))):Be(i.POLYGON_OFFSET_FILL)}function Te(P){P?_e(i.SCISSOR_TEST):Be(i.SCISSOR_TEST)}function ze(P){P===void 0&&(P=i.TEXTURE0+z-1),Z!==P&&(i.activeTexture(P),Z=P)}function Ge(P,J,K){K===void 0&&(Z===null?K=i.TEXTURE0+z-1:K=Z);let le=te[K];le===void 0&&(le={type:void 0,texture:void 0},te[K]=le),(le.type!==P||le.texture!==J)&&(Z!==K&&(i.activeTexture(K),Z=K),i.bindTexture(P,J||Pe[P]),le.type=P,le.texture=J)}function U(){const P=te[Z];P!==void 0&&P.type!==void 0&&(i.bindTexture(P.type,null),P.type=void 0,P.texture=void 0)}function Qe(){try{i.compressedTexImage2D(...arguments)}catch(P){Xe("WebGLState:",P)}}function pt(){try{i.compressedTexImage3D(...arguments)}catch(P){Xe("WebGLState:",P)}}function mt(){try{i.texSubImage2D(...arguments)}catch(P){Xe("WebGLState:",P)}}function ve(){try{i.texSubImage3D(...arguments)}catch(P){Xe("WebGLState:",P)}}function $e(){try{i.compressedTexSubImage2D(...arguments)}catch(P){Xe("WebGLState:",P)}}function fe(){try{i.compressedTexSubImage3D(...arguments)}catch(P){Xe("WebGLState:",P)}}function Ue(){try{i.texStorage2D(...arguments)}catch(P){Xe("WebGLState:",P)}}function w(){try{i.texStorage3D(...arguments)}catch(P){Xe("WebGLState:",P)}}function M(){try{i.texImage2D(...arguments)}catch(P){Xe("WebGLState:",P)}}function k(){try{i.texImage3D(...arguments)}catch(P){Xe("WebGLState:",P)}}function ie(P){return h[P]!==void 0?h[P]:i.getParameter(P)}function q(P,J){h[P]!==J&&(i.pixelStorei(P,J),h[P]=J)}function ne(P){Q.equals(P)===!1&&(i.scissor(P.x,P.y,P.z,P.w),Q.copy(P))}function he(P){me.equals(P)===!1&&(i.viewport(P.x,P.y,P.z,P.w),me.copy(P))}function $(P,J){let K=c.get(J);K===void 0&&(K=new WeakMap,c.set(J,K));let le=K.get(P);le===void 0&&(le=i.getUniformBlockIndex(J,P.name),i.uniformBlockBinding(J,le,le),K.set(P,le))}function j(P,J,K){const ae=c.get(J).get(P);l[ae]!==K&&(i.bindBufferBase(i.UNIFORM_BUFFER,ae,K),l[ae]=K)}function ue(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),o.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),i.pixelStorei(i.PACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,!1),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,i.BROWSER_DEFAULT_WEBGL),i.pixelStorei(i.PACK_ROW_LENGTH,0),i.pixelStorei(i.PACK_SKIP_PIXELS,0),i.pixelStorei(i.PACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_ROW_LENGTH,0),i.pixelStorei(i.UNPACK_IMAGE_HEIGHT,0),i.pixelStorei(i.UNPACK_SKIP_PIXELS,0),i.pixelStorei(i.UNPACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_SKIP_IMAGES,0),u={},h={},Z=null,te={},d={},l={},f=new WeakMap,g=[],v=null,p=!1,m=null,x=null,A=null,y=null,b=null,E=null,_=null,S=new Ne(0,0,0),D=0,R=!1,N=null,O=null,W=null,L=null,G=null,Q.set(0,0,i.canvas.width,i.canvas.height),me.set(0,0,i.canvas.width,i.canvas.height),s.reset(),o.reset(),a.reset()}return{buffers:{color:s,depth:o,stencil:a},enable:_e,disable:Be,bindFramebuffer:dt,drawBuffers:Ce,useProgram:Ke,setBlending:st,setMaterial:et,setFlipSided:ot,setCullFace:F,setLineWidth:re,setPolygonOffset:oe,setScissorTest:Te,activeTexture:ze,bindTexture:Ge,unbindTexture:U,compressedTexImage2D:Qe,compressedTexImage3D:pt,texImage2D:M,texImage3D:k,pixelStorei:q,getParameter:ie,updateUBOMapping:$,uniformBlockBinding:j,texStorage2D:Ue,texStorage3D:w,texSubImage2D:mt,texSubImage3D:ve,compressedTexSubImage2D:$e,compressedTexSubImage3D:fe,scissor:ne,viewport:he,reset:ue}}function Fv(i,e,t,n,r,s,o){const a=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new Ye,u=new WeakMap,h=new Set;let d;const f=new WeakMap,g=new Set,v=new FinalizationRegistry(w=>g.delete(w));let p=!1;try{p=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function m(w,M){return p?new OffscreenCanvas(w,M):us("canvas")}function x(w,M,k){let ie=1;const q=Ue(w);if((q.width>k||q.height>k)&&(ie=k/Math.max(q.width,q.height)),ie<1)if(typeof HTMLImageElement<"u"&&w instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&w instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&w instanceof ImageBitmap||typeof VideoFrame<"u"&&w instanceof VideoFrame){const ne=Math.floor(ie*q.width),he=Math.floor(ie*q.height);d===void 0&&(d=m(ne,he));const $=M?m(ne,he):d;return $.width=ne,$.height=he,$.getContext("2d").drawImage(w,0,0,ne,he),De("WebGLRenderer: Texture has been resized from ("+q.width+"x"+q.height+") to ("+ne+"x"+he+")."),$}else return"data"in w&&De("WebGLRenderer: Image in DataTexture is too big ("+q.width+"x"+q.height+")."),w;return w}function A(w){return w.generateMipmaps}function y(w){i.generateMipmap(w)}function b(w){return w.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:w.isWebGL3DRenderTarget?i.TEXTURE_3D:w.isWebGLArrayRenderTarget||w.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function E(w,M,k,ie,q,ne=!1){if(w!==null){if(i[w]!==void 0)return i[w];De("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+w+"'")}let he;ie&&(he=e.get("EXT_texture_norm16"),he||De("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let $=M;if(M===i.RED&&(k===i.FLOAT&&($=i.R32F),k===i.HALF_FLOAT&&($=i.R16F),k===i.UNSIGNED_BYTE&&($=i.R8),k===i.UNSIGNED_SHORT&&he&&($=he.R16_EXT),k===i.SHORT&&he&&($=he.R16_SNORM_EXT)),M===i.RED_INTEGER&&(k===i.UNSIGNED_BYTE&&($=i.R8UI),k===i.UNSIGNED_SHORT&&($=i.R16UI),k===i.UNSIGNED_INT&&($=i.R32UI),k===i.BYTE&&($=i.R8I),k===i.SHORT&&($=i.R16I),k===i.INT&&($=i.R32I)),M===i.RG&&(k===i.FLOAT&&($=i.RG32F),k===i.HALF_FLOAT&&($=i.RG16F),k===i.UNSIGNED_BYTE&&($=i.RG8),k===i.UNSIGNED_SHORT&&he&&($=he.RG16_EXT),k===i.SHORT&&he&&($=he.RG16_SNORM_EXT)),M===i.RG_INTEGER&&(k===i.UNSIGNED_BYTE&&($=i.RG8UI),k===i.UNSIGNED_SHORT&&($=i.RG16UI),k===i.UNSIGNED_INT&&($=i.RG32UI),k===i.BYTE&&($=i.RG8I),k===i.SHORT&&($=i.RG16I),k===i.INT&&($=i.RG32I)),M===i.RGB_INTEGER&&(k===i.UNSIGNED_BYTE&&($=i.RGB8UI),k===i.UNSIGNED_SHORT&&($=i.RGB16UI),k===i.UNSIGNED_INT&&($=i.RGB32UI),k===i.BYTE&&($=i.RGB8I),k===i.SHORT&&($=i.RGB16I),k===i.INT&&($=i.RGB32I)),M===i.RGBA_INTEGER&&(k===i.UNSIGNED_BYTE&&($=i.RGBA8UI),k===i.UNSIGNED_SHORT&&($=i.RGBA16UI),k===i.UNSIGNED_INT&&($=i.RGBA32UI),k===i.BYTE&&($=i.RGBA8I),k===i.SHORT&&($=i.RGBA16I),k===i.INT&&($=i.RGBA32I)),M===i.RGB&&(k===i.UNSIGNED_SHORT&&he&&($=he.RGB16_EXT),k===i.SHORT&&he&&($=he.RGB16_SNORM_EXT),k===i.UNSIGNED_INT_5_9_9_9_REV&&($=i.RGB9_E5),k===i.UNSIGNED_INT_10F_11F_11F_REV&&($=i.R11F_G11F_B10F)),M===i.RGBA){const j=ne?ho:tt.getTransfer(q);k===i.FLOAT&&($=i.RGBA32F),k===i.HALF_FLOAT&&($=i.RGBA16F),k===i.UNSIGNED_BYTE&&($=j===gt?i.SRGB8_ALPHA8:i.RGBA8),k===i.UNSIGNED_SHORT&&he&&($=he.RGBA16_EXT),k===i.SHORT&&he&&($=he.RGBA16_SNORM_EXT),k===i.UNSIGNED_SHORT_4_4_4_4&&($=i.RGBA4),k===i.UNSIGNED_SHORT_5_5_5_1&&($=i.RGB5_A1)}return($===i.R16F||$===i.R32F||$===i.RG16F||$===i.RG32F||$===i.RGBA16F||$===i.RGBA32F)&&e.get("EXT_color_buffer_float"),$}function _(w,M){let k;return w?M===null||M===Fn||M===_r?k=i.DEPTH24_STENCIL8:M===ln?k=i.DEPTH32F_STENCIL8:M===os&&(k=i.DEPTH24_STENCIL8,De("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):M===null||M===Fn||M===_r?k=i.DEPTH_COMPONENT24:M===ln?k=i.DEPTH_COMPONENT32F:M===os&&(k=i.DEPTH_COMPONENT16),k}function S(w,M){return A(w)===!0||w.isFramebufferTexture&&w.minFilter!==It&&w.minFilter!==Bt?Math.log2(Math.max(M.width,M.height))+1:w.mipmaps.length>0?w.mipmaps.length:w.isCompressedTexture&&Array.isArray(w.image)?M.mipmaps.length:1}function D(w){const M=new WeakRef(w);n.get(w).__ref=M,g.add(M),v.register(w,M,M)}function R(w){const M=n.get(w).__ref;M!==void 0&&(g.delete(M),v.unregister(M))}function N(w){W(w.target)}function O(w){L(w.target)}function W(w){w.removeEventListener("dispose",N),R(w),z(w),w.isVideoTexture&&u.delete(w),w.isHTMLTexture&&h.delete(w)}function L(w){w.removeEventListener("dispose",O),R(w),ee(w)}function G(){for(const w of g){const M=w.deref();M!==void 0&&(M.isRenderTarget===!0?L(M):W(M))}g.clear(),h.clear()}function z(w){const M=n.get(w);if(M.__webglInit===void 0)return;const k=w.source,ie=f.get(k);if(ie){const q=ie[M.__cacheKey];q.usedTimes--,q.usedTimes===0&&B(w),Object.keys(ie).length===0&&f.delete(k)}n.remove(w)}function B(w){const M=n.get(w);i.deleteTexture(M.__webglTexture);const k=w.source,ie=f.get(k);delete ie[M.__cacheKey],o.memory.textures--}function ee(w){const M=n.get(w);M.__depthDisposeCallback&&M.__depthDisposeCallback();const k=w.depthTexture;if(k&&k.renderTarget===w&&W(k),w.isWebGLCubeRenderTarget)for(let q=0;q<6;q++){if(Array.isArray(M.__webglFramebuffer[q]))for(let ne=0;ne<M.__webglFramebuffer[q].length;ne++)i.deleteFramebuffer(M.__webglFramebuffer[q][ne]);else i.deleteFramebuffer(M.__webglFramebuffer[q]);M.__webglDepthbuffer&&i.deleteRenderbuffer(M.__webglDepthbuffer[q])}else{if(Array.isArray(M.__webglFramebuffer))for(let q=0;q<M.__webglFramebuffer.length;q++)i.deleteFramebuffer(M.__webglFramebuffer[q]);else i.deleteFramebuffer(M.__webglFramebuffer);if(M.__webglDepthbuffer&&i.deleteRenderbuffer(M.__webglDepthbuffer),M.__webglMultisampledFramebuffer&&i.deleteFramebuffer(M.__webglMultisampledFramebuffer),M.__webglColorRenderbuffer)for(let q=0;q<M.__webglColorRenderbuffer.length;q++)M.__webglColorRenderbuffer[q]&&i.deleteRenderbuffer(M.__webglColorRenderbuffer[q]);M.__webglDepthRenderbuffer&&i.deleteRenderbuffer(M.__webglDepthRenderbuffer)}const ie=w.textures;for(let q=0,ne=ie.length;q<ne;q++){const he=n.get(ie[q]);he.__webglTexture&&(i.deleteTexture(he.__webglTexture),o.memory.textures--),n.remove(ie[q])}n.remove(w)}let Y=0;function Z(){Y=0}function te(){return Y}function ye(w){Y=w}function ke(){const w=Y;return w>=r.maxTextures&&De("WebGLTextures: Trying to use "+(w+1)+" texture units while this GPU supports only "+r.maxTextures),Y+=1,w}function Q(w){const M=[];return M.push(w.wrapS),M.push(w.wrapT),M.push(w.wrapR||0),M.push(w.magFilter),M.push(w.minFilter),M.push(w.anisotropy),M.push(w.internalFormat),M.push(w.format),M.push(w.type),M.push(w.generateMipmaps),M.push(w.mipmapsAutoUpdate),M.push(w.premultiplyAlpha),M.push(w.flipY),M.push(w.unpackAlignment),M.push(w.colorSpace),M.join()}function me(w,M){const k=n.get(w);if(w.isVideoTexture&&$e(w),w.isRenderTargetTexture===!1&&w.isExternalTexture!==!0&&w.version>0&&k.__version!==w.version){const ie=w.image;if(ie===null)De("WebGLRenderer: Texture marked for update but no image data found.");else if(ie.complete===!1)De("WebGLRenderer: Texture marked for update but image is incomplete");else{et(k,w,M);return}}else w.isExternalTexture&&(k.__webglTexture=w.sourceTexture?w.sourceTexture:null);t.bindTexture(i.TEXTURE_2D,k.__webglTexture,i.TEXTURE0+M)}function Me(w,M){const k=n.get(w);if(w.isRenderTargetTexture===!1&&w.version>0&&k.__version!==w.version){et(k,w,M);return}else w.isExternalTexture&&(k.__webglTexture=w.sourceTexture?w.sourceTexture:null);t.bindTexture(i.TEXTURE_2D_ARRAY,k.__webglTexture,i.TEXTURE0+M)}function Pe(w,M){const k=n.get(w);if(w.isRenderTargetTexture===!1&&w.version>0&&k.__version!==w.version){et(k,w,M);return}t.bindTexture(i.TEXTURE_3D,k.__webglTexture,i.TEXTURE0+M)}function _e(w,M){const k=n.get(w);if(w.version>0&&k.__version!==w.version){ot(k,w,M);return}t.bindTexture(i.TEXTURE_CUBE_MAP,k.__webglTexture,i.TEXTURE0+M)}const Be={[_i]:i.REPEAT,[Dn]:i.CLAMP_TO_EDGE,[ao]:i.MIRRORED_REPEAT},dt={[It]:i.NEAREST,[Th]:i.NEAREST_MIPMAP_NEAREST,[Kr]:i.NEAREST_MIPMAP_LINEAR,[Bt]:i.LINEAR,[Qs]:i.LINEAR_MIPMAP_NEAREST,[vn]:i.LINEAR_MIPMAP_LINEAR},Ce={[pf]:i.NEVER,[Nh]:i.ALWAYS,[mf]:i.LESS,[Lh]:i.LEQUAL,[gf]:i.EQUAL,[Ih]:i.GEQUAL,[_f]:i.GREATER,[vf]:i.NOTEQUAL};function Ke(w,M){if(M.type===ln&&e.has("OES_texture_float_linear")===!1&&(M.magFilter===Bt||M.magFilter===Qs||M.magFilter===Kr||M.magFilter===vn||M.minFilter===Bt||M.minFilter===Qs||M.minFilter===Kr||M.minFilter===vn)&&De("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(w,i.TEXTURE_WRAP_S,Be[M.wrapS]),i.texParameteri(w,i.TEXTURE_WRAP_T,Be[M.wrapT]),(w===i.TEXTURE_3D||w===i.TEXTURE_2D_ARRAY)&&i.texParameteri(w,i.TEXTURE_WRAP_R,Be[M.wrapR]),i.texParameteri(w,i.TEXTURE_MAG_FILTER,dt[M.magFilter]),i.texParameteri(w,i.TEXTURE_MIN_FILTER,dt[M.minFilter]),M.compareFunction&&(i.texParameteri(w,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(w,i.TEXTURE_COMPARE_FUNC,Ce[M.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(M.magFilter===It||M.minFilter!==Kr&&M.minFilter!==vn||M.type===ln&&e.has("OES_texture_float_linear")===!1)return;if(M.anisotropy>1||n.get(M).__currentAnisotropy){const k=e.get("EXT_texture_filter_anisotropic");i.texParameterf(w,k.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(M.anisotropy,r.getMaxAnisotropy())),n.get(M).__currentAnisotropy=M.anisotropy}}}function Ze(w,M){let k=!1;w.__webglInit===void 0&&(w.__webglInit=!0,M.addEventListener("dispose",N),D(M));const ie=M.source;let q=f.get(ie);q===void 0&&(q={},f.set(ie,q));const ne=Q(M);if(ne!==w.__cacheKey){q[ne]===void 0&&(q[ne]={texture:i.createTexture(),usedTimes:0},o.memory.textures++,k=!0),q[ne].usedTimes++;const he=q[w.__cacheKey];he!==void 0&&(q[w.__cacheKey].usedTimes--,he.usedTimes===0&&B(M)),w.__cacheKey=ne,w.__webglTexture=q[ne].texture}return k}function He(w,M,k){return Math.floor(Math.floor(w/k)/M)}function st(w,M,k,ie){const ne=w.updateRanges;if(ne.length===0)t.texSubImage2D(i.TEXTURE_2D,0,0,0,M.width,M.height,k,ie,M.data);else{ne.sort((P,J)=>P.start-J.start);let he=0;for(let P=1;P<ne.length;P++){const J=ne[he],K=ne[P],le=J.start+J.count,ae=He(K.start,M.width,4),ce=He(J.start,M.width,4);K.start<=le+1&&ae===ce&&He(K.start+K.count-1,M.width,4)===ae?J.count=Math.max(J.count,K.start+K.count-J.start):(++he,ne[he]=K)}ne.length=he+1;const $=t.getParameter(i.UNPACK_ROW_LENGTH),j=t.getParameter(i.UNPACK_SKIP_PIXELS),ue=t.getParameter(i.UNPACK_SKIP_ROWS);t.pixelStorei(i.UNPACK_ROW_LENGTH,M.width);for(let P=0,J=ne.length;P<J;P++){const K=ne[P],le=Math.floor(K.start/4),ae=Math.ceil(K.count/4),ce=le%M.width,be=Math.floor(le/M.width),Ae=ae,se=1;t.pixelStorei(i.UNPACK_SKIP_PIXELS,ce),t.pixelStorei(i.UNPACK_SKIP_ROWS,be),t.texSubImage2D(i.TEXTURE_2D,0,ce,be,Ae,se,k,ie,M.data)}w.clearUpdateRanges(),t.pixelStorei(i.UNPACK_ROW_LENGTH,$),t.pixelStorei(i.UNPACK_SKIP_PIXELS,j),t.pixelStorei(i.UNPACK_SKIP_ROWS,ue)}}function et(w,M,k){let ie=i.TEXTURE_2D;(M.isDataArrayTexture||M.isCompressedArrayTexture)&&(ie=i.TEXTURE_2D_ARRAY),M.isData3DTexture&&(ie=i.TEXTURE_3D);const q=Ze(w,M),ne=M.source;t.bindTexture(ie,w.__webglTexture,i.TEXTURE0+k);const he=n.get(ne);if(ne.version!==he.__version||q===!0){if(t.activeTexture(i.TEXTURE0+k),(typeof ImageBitmap<"u"&&M.image instanceof ImageBitmap)===!1){const se=tt.getPrimaries(tt.workingColorSpace),Ie=M.colorSpace===pi?null:tt.getPrimaries(M.colorSpace),We=M.colorSpace===pi||se===Ie?i.NONE:i.BROWSER_DEFAULT_WEBGL;t.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,M.flipY),t.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,M.premultiplyAlpha),t.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,We)}t.pixelStorei(i.UNPACK_ALIGNMENT,M.unpackAlignment);let j=x(M.image,!1,r.maxTextureSize);j=fe(M,j);const ue=s.convert(M.format,M.colorSpace),P=s.convert(M.type);let J=E(M.internalFormat,ue,P,M.normalized,M.colorSpace,M.isVideoTexture);Ke(ie,M);let K;const le=M.mipmaps,ae=M.isVideoTexture!==!0,ce=he.__version===void 0||q===!0,be=ne.dataReady,Ae=S(M,j);if(M.isDepthTexture)J=_(M.format===mi,M.type),ce&&(ae?t.texStorage2D(i.TEXTURE_2D,1,J,j.width,j.height):t.texImage2D(i.TEXTURE_2D,0,J,j.width,j.height,0,ue,P,null));else if(M.isDataTexture)if(le.length>0){ae&&ce&&t.texStorage2D(i.TEXTURE_2D,Ae,J,le[0].width,le[0].height);for(let se=0,Ie=le.length;se<Ie;se++)K=le[se],ae?be&&t.texSubImage2D(i.TEXTURE_2D,se,0,0,K.width,K.height,ue,P,K.data):t.texImage2D(i.TEXTURE_2D,se,J,K.width,K.height,0,ue,P,K.data);M.generateMipmaps=!1}else ae?(ce&&t.texStorage2D(i.TEXTURE_2D,Ae,J,j.width,j.height),be&&st(M,j,ue,P)):t.texImage2D(i.TEXTURE_2D,0,J,j.width,j.height,0,ue,P,j.data);else if(M.isCompressedTexture)if(M.isCompressedArrayTexture){ae&&ce&&t.texStorage3D(i.TEXTURE_2D_ARRAY,Ae,J,le[0].width,le[0].height,j.depth);for(let se=0,Ie=le.length;se<Ie;se++)if(K=le[se],M.format!==xn)if(ue!==null)if(ae){if(be)if(M.layerUpdates.size>0){const We=$c(K.width,K.height,M.format,M.type);for(const de of M.layerUpdates){const at=K.data.subarray(de*We/K.data.BYTES_PER_ELEMENT,(de+1)*We/K.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,se,0,0,de,K.width,K.height,1,ue,at)}}else t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,se,0,0,0,K.width,K.height,j.depth,ue,K.data)}else t.compressedTexImage3D(i.TEXTURE_2D_ARRAY,se,J,K.width,K.height,j.depth,0,K.data,0,0);else De("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else ae?be&&t.texSubImage3D(i.TEXTURE_2D_ARRAY,se,0,0,0,K.width,K.height,j.depth,ue,P,K.data):t.texImage3D(i.TEXTURE_2D_ARRAY,se,J,K.width,K.height,j.depth,0,ue,P,K.data);M.layerUpdates.size>0&&M.clearLayerUpdates()}else{ae&&ce&&t.texStorage2D(i.TEXTURE_2D,Ae,J,le[0].width,le[0].height);for(let se=0,Ie=le.length;se<Ie;se++)K=le[se],M.format!==xn?ue!==null?ae?be&&t.compressedTexSubImage2D(i.TEXTURE_2D,se,0,0,K.width,K.height,ue,K.data):t.compressedTexImage2D(i.TEXTURE_2D,se,J,K.width,K.height,0,K.data):De("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):ae?be&&t.texSubImage2D(i.TEXTURE_2D,se,0,0,K.width,K.height,ue,P,K.data):t.texImage2D(i.TEXTURE_2D,se,J,K.width,K.height,0,ue,P,K.data)}else if(M.isDataArrayTexture)if(ae){if(ce&&t.texStorage3D(i.TEXTURE_2D_ARRAY,Ae,J,j.width,j.height,j.depth),be)if(M.layerUpdates.size>0){const se=$c(j.width,j.height,M.format,M.type);for(const Ie of M.layerUpdates){const We=j.data.subarray(Ie*se/j.data.BYTES_PER_ELEMENT,(Ie+1)*se/j.data.BYTES_PER_ELEMENT);t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,Ie,j.width,j.height,1,ue,P,We)}M.clearLayerUpdates()}else t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,j.width,j.height,j.depth,ue,P,j.data)}else t.texImage3D(i.TEXTURE_2D_ARRAY,0,J,j.width,j.height,j.depth,0,ue,P,j.data);else if(M.isData3DTexture)ae?(ce&&t.texStorage3D(i.TEXTURE_3D,Ae,J,j.width,j.height,j.depth),be&&t.texSubImage3D(i.TEXTURE_3D,0,0,0,0,j.width,j.height,j.depth,ue,P,j.data)):t.texImage3D(i.TEXTURE_3D,0,J,j.width,j.height,j.depth,0,ue,P,j.data);else if(M.isFramebufferTexture){if(ce)if(ae)t.texStorage2D(i.TEXTURE_2D,Ae,J,j.width,j.height);else{let se=j.width,Ie=j.height;for(let We=0;We<Ae;We++)t.texImage2D(i.TEXTURE_2D,We,J,se,Ie,0,ue,P,null),se>>=1,Ie>>=1}}else if(M.isHTMLTexture){if("texElementImage2D"in i){const se=i.canvas;if(se.hasAttribute("layoutsubtree")||se.setAttribute("layoutsubtree","true"),j.parentNode!==se){se.appendChild(j),h.add(M),se.onpaint=Ie=>{const We=Ie.changedElements;for(const de of h)We.includes(de.image)&&(de.needsUpdate=!0)},se.requestPaint();return}if(i.texElementImage2D.length===3)i.texElementImage2D(i.TEXTURE_2D,i.RGBA8,j);else{const We=i.RGBA,de=i.RGBA,at=i.UNSIGNED_BYTE;i.texElementImage2D(i.TEXTURE_2D,0,We,de,at,j)}i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.CLAMP_TO_EDGE),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.CLAMP_TO_EDGE)}}else if(le.length>0){if(ae&&ce){const se=Ue(le[0]);t.texStorage2D(i.TEXTURE_2D,Ae,J,se.width,se.height)}for(let se=0,Ie=le.length;se<Ie;se++)K=le[se],ae?be&&t.texSubImage2D(i.TEXTURE_2D,se,0,0,ue,P,K):t.texImage2D(i.TEXTURE_2D,se,J,ue,P,K);M.generateMipmaps=!1}else if(ae){if(ce){const se=Ue(j);t.texStorage2D(i.TEXTURE_2D,Ae,J,se.width,se.height)}be&&t.texSubImage2D(i.TEXTURE_2D,0,0,0,ue,P,j)}else t.texImage2D(i.TEXTURE_2D,0,J,ue,P,j);A(M)&&M.mipmapsAutoUpdate===!0&&y(ie),he.__version=ne.version,M.onUpdate&&M.onUpdate(M)}w.__version=M.version}function ot(w,M,k){if(M.image.length!==6)return;const ie=Ze(w,M),q=M.source;t.bindTexture(i.TEXTURE_CUBE_MAP,w.__webglTexture,i.TEXTURE0+k);const ne=n.get(q);if(q.version!==ne.__version||ie===!0){t.activeTexture(i.TEXTURE0+k);const he=tt.getPrimaries(tt.workingColorSpace),$=M.colorSpace===pi?null:tt.getPrimaries(M.colorSpace),j=M.colorSpace===pi||he===$?i.NONE:i.BROWSER_DEFAULT_WEBGL;t.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,M.flipY),t.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,M.premultiplyAlpha),t.pixelStorei(i.UNPACK_ALIGNMENT,M.unpackAlignment),t.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,j);const ue=M.isCompressedTexture||M.image[0].isCompressedTexture,P=M.image[0]&&M.image[0].isDataTexture,J=[];for(let de=0;de<6;de++)!ue&&!P?J[de]=x(M.image[de],!0,r.maxCubemapSize):J[de]=P?M.image[de].image:M.image[de],J[de]=fe(M,J[de]);const K=J[0],le=s.convert(M.format,M.colorSpace),ae=s.convert(M.type);let ce=E(M.internalFormat,le,ae,M.normalized,M.colorSpace);const be=M.isVideoTexture!==!0,Ae=ne.__version===void 0||ie===!0,se=q.dataReady;let Ie=S(M,K);Ke(i.TEXTURE_CUBE_MAP,M);let We;if(M.isDepthTexture){if(ce=_(M.format===mi,M.type),Ae)if(be)t.texStorage2D(i.TEXTURE_CUBE_MAP,1,ce,K.width,K.height);else for(let de=0;de<6;de++)t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+de,0,ce,K.width,K.height,0,le,ae,null)}else if(ue){be&&Ae&&t.texStorage2D(i.TEXTURE_CUBE_MAP,Ie,ce,K.width,K.height);for(let de=0;de<6;de++){We=J[de].mipmaps;for(let at=0;at<We.length;at++){const bt=We[at];M.format!==xn?le!==null?be?se&&t.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+de,at,0,0,bt.width,bt.height,le,bt.data):t.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+de,at,ce,bt.width,bt.height,0,bt.data):De("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):be?se&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+de,at,0,0,bt.width,bt.height,le,ae,bt.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+de,at,ce,bt.width,bt.height,0,le,ae,bt.data)}}}else{if(We=M.mipmaps,be&&Ae){We.length>0&&Ie++;const de=Ue(J[0]);t.texStorage2D(i.TEXTURE_CUBE_MAP,Ie,ce,de.width,de.height)}for(let de=0;de<6;de++)if(P){be?se&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+de,0,0,0,J[de].width,J[de].height,le,ae,J[de].data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+de,0,ce,J[de].width,J[de].height,0,le,ae,J[de].data);for(let at=0;at<We.length;at++){const nn=We[at].image[de].image;be?se&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+de,at+1,0,0,nn.width,nn.height,le,ae,nn.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+de,at+1,ce,nn.width,nn.height,0,le,ae,nn.data)}}else{be?se&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+de,0,0,0,le,ae,J[de]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+de,0,ce,le,ae,J[de]);for(let at=0;at<We.length;at++){const bt=We[at];be?se&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+de,at+1,0,0,le,ae,bt.image[de]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+de,at+1,ce,le,ae,bt.image[de])}}}A(M)&&M.mipmapsAutoUpdate===!0&&y(i.TEXTURE_CUBE_MAP),ne.__version=q.version,M.onUpdate&&M.onUpdate(M)}w.__version=M.version}function F(w,M,k,ie,q,ne){const he=s.convert(k.format,k.colorSpace),$=s.convert(k.type),j=E(k.internalFormat,he,$,k.normalized,k.colorSpace),ue=n.get(M),P=n.get(k);if(P.__renderTarget=M,!ue.__hasExternalTextures){const J=Math.max(1,M.width>>ne),K=Math.max(1,M.height>>ne);q===i.TEXTURE_3D||q===i.TEXTURE_2D_ARRAY?t.texImage3D(q,ne,j,J,K,M.depth,0,he,$,null):t.texImage2D(q,ne,j,J,K,0,he,$,null)}t.bindFramebuffer(i.FRAMEBUFFER,w),ve(M)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,ie,q,P.__webglTexture,0,mt(M)):(q===i.TEXTURE_2D||q>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&q<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,ie,q,P.__webglTexture,ne),t.bindFramebuffer(i.FRAMEBUFFER,null)}function re(w,M,k){if(i.bindRenderbuffer(i.RENDERBUFFER,w),M.depthBuffer){const ie=M.depthTexture,q=ie&&ie.isDepthTexture?ie.type:null,ne=_(M.stencilBuffer,q),he=M.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;ve(M)?a.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,mt(M),ne,M.width,M.height):k?i.renderbufferStorageMultisample(i.RENDERBUFFER,mt(M),ne,M.width,M.height):i.renderbufferStorage(i.RENDERBUFFER,ne,M.width,M.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,he,i.RENDERBUFFER,w)}else{const ie=M.textures;for(let q=0;q<ie.length;q++){const ne=ie[q],he=s.convert(ne.format,ne.colorSpace),$=s.convert(ne.type),j=E(ne.internalFormat,he,$,ne.normalized,ne.colorSpace);ve(M)?a.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,mt(M),j,M.width,M.height):k?i.renderbufferStorageMultisample(i.RENDERBUFFER,mt(M),j,M.width,M.height):i.renderbufferStorage(i.RENDERBUFFER,j,M.width,M.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function oe(w,M,k){const ie=M.isWebGLCubeRenderTarget===!0;if(t.bindFramebuffer(i.FRAMEBUFFER,w),!(M.depthTexture&&M.depthTexture.isDepthTexture))throw new Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");const q=n.get(M.depthTexture);q.__renderTarget=M;const ne=ie?M.depthTexture.image[0]:M.depthTexture.image;(!q.__webglTexture||ne.width!==M.width||ne.height!==M.height)&&(ne.width=M.width,ne.height=M.height,M.depthTexture.needsUpdate=!0),ie?_e(M.depthTexture,0):me(M.depthTexture,0);const he=q.__webglTexture,$=mt(M),j=ie?i.TEXTURE_CUBE_MAP_POSITIVE_X+k:i.TEXTURE_2D,ue=M.depthTexture.format===mi?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;if(M.depthTexture.format===vi)ve(M)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,ue,j,he,0,$):i.framebufferTexture2D(i.FRAMEBUFFER,ue,j,he,0);else if(M.depthTexture.format===mi)ve(M)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,ue,j,he,0,$):i.framebufferTexture2D(i.FRAMEBUFFER,ue,j,he,0);else throw new Error("THREE.WebGLTextures: Unknown depthTexture format.")}function Te(w){const M=n.get(w),k=w.isWebGLCubeRenderTarget===!0;if(M.__boundDepthTexture!==w.depthTexture){const ie=w.depthTexture;if(M.__depthDisposeCallback&&M.__depthDisposeCallback(),ie){const q=()=>{delete M.__boundDepthTexture,delete M.__depthDisposeCallback,ie.removeEventListener("dispose",q)};ie.addEventListener("dispose",q),M.__depthDisposeCallback=q}M.__boundDepthTexture=ie}if(w.depthTexture&&!M.__autoAllocateDepthBuffer)if(k)for(let ie=0;ie<6;ie++)oe(M.__webglFramebuffer[ie],w,ie);else w.texture.mipmaps.length>0?oe(M.__webglFramebuffer[0],w,0):oe(M.__webglFramebuffer,w,0);else if(k){M.__webglDepthbuffer=[];for(let ie=0;ie<6;ie++)if(t.bindFramebuffer(i.FRAMEBUFFER,M.__webglFramebuffer[ie]),M.__webglDepthbuffer[ie]===void 0)M.__webglDepthbuffer[ie]=i.createRenderbuffer(),re(M.__webglDepthbuffer[ie],w,!1);else{const q=w.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,ne=M.__webglDepthbuffer[ie];i.bindRenderbuffer(i.RENDERBUFFER,ne),i.framebufferRenderbuffer(i.FRAMEBUFFER,q,i.RENDERBUFFER,ne)}}else if(w.texture.mipmaps.length>0?t.bindFramebuffer(i.FRAMEBUFFER,M.__webglFramebuffer[0]):t.bindFramebuffer(i.FRAMEBUFFER,M.__webglFramebuffer),M.__webglDepthbuffer===void 0)M.__webglDepthbuffer=i.createRenderbuffer(),re(M.__webglDepthbuffer,w,!1);else{const q=w.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,ne=M.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,ne),i.framebufferRenderbuffer(i.FRAMEBUFFER,q,i.RENDERBUFFER,ne)}t.bindFramebuffer(i.FRAMEBUFFER,null)}function ze(w,M,k){const ie=n.get(w);M!==void 0&&F(ie.__webglFramebuffer,w,w.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),k!==void 0&&Te(w)}function Ge(w){const M=w.texture,k=n.get(w),ie=n.get(M);w.addEventListener("dispose",O),D(w);const q=w.textures,ne=w.isWebGLCubeRenderTarget===!0,he=q.length>1;if(he||(ie.__webglTexture===void 0&&(ie.__webglTexture=i.createTexture()),ie.__version=M.version,o.memory.textures++),ne){k.__webglFramebuffer=[];for(let $=0;$<6;$++)if(M.mipmaps.length>0){k.__webglFramebuffer[$]=[];for(let j=0;j<M.mipmaps.length;j++)k.__webglFramebuffer[$][j]=i.createFramebuffer()}else k.__webglFramebuffer[$]=i.createFramebuffer()}else{if(M.mipmaps.length>0){k.__webglFramebuffer=[];for(let $=0;$<M.mipmaps.length;$++)k.__webglFramebuffer[$]=i.createFramebuffer()}else k.__webglFramebuffer=i.createFramebuffer();if(he)for(let $=0,j=q.length;$<j;$++){const ue=n.get(q[$]);ue.__webglTexture===void 0&&(ue.__webglTexture=i.createTexture(),o.memory.textures++)}if(w.samples>0&&ve(w)===!1){k.__webglMultisampledFramebuffer=i.createFramebuffer(),k.__webglColorRenderbuffer=[],t.bindFramebuffer(i.FRAMEBUFFER,k.__webglMultisampledFramebuffer);for(let $=0;$<q.length;$++){const j=q[$];k.__webglColorRenderbuffer[$]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,k.__webglColorRenderbuffer[$]);const ue=s.convert(j.format,j.colorSpace),P=s.convert(j.type),J=E(j.internalFormat,ue,P,j.normalized,j.colorSpace,w.isXRRenderTarget===!0),K=mt(w);i.renderbufferStorageMultisample(i.RENDERBUFFER,K,J,w.width,w.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+$,i.RENDERBUFFER,k.__webglColorRenderbuffer[$])}i.bindRenderbuffer(i.RENDERBUFFER,null),w.depthBuffer&&(k.__webglDepthRenderbuffer=i.createRenderbuffer(),re(k.__webglDepthRenderbuffer,w,!0)),t.bindFramebuffer(i.FRAMEBUFFER,null)}}if(ne){t.bindTexture(i.TEXTURE_CUBE_MAP,ie.__webglTexture),Ke(i.TEXTURE_CUBE_MAP,M);for(let $=0;$<6;$++)if(M.mipmaps.length>0)for(let j=0;j<M.mipmaps.length;j++)F(k.__webglFramebuffer[$][j],w,M,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+$,j);else F(k.__webglFramebuffer[$],w,M,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+$,0);A(M)?y(i.TEXTURE_CUBE_MAP):M.mipmaps.length>0&&i.texParameteri(i.TEXTURE_CUBE_MAP,i.TEXTURE_MAX_LEVEL,M.mipmaps.length-1),t.unbindTexture()}else if(he){for(let $=0,j=q.length;$<j;$++){const ue=q[$],P=n.get(ue);let J=i.TEXTURE_2D;(w.isWebGL3DRenderTarget||w.isWebGLArrayRenderTarget)&&(J=w.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(J,P.__webglTexture),Ke(J,ue),F(k.__webglFramebuffer,w,ue,i.COLOR_ATTACHMENT0+$,J,0),A(ue)&&y(J)}t.unbindTexture()}else{let $=i.TEXTURE_2D;if((w.isWebGL3DRenderTarget||w.isWebGLArrayRenderTarget)&&($=w.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture($,ie.__webglTexture),Ke($,M),M.mipmaps.length>0)for(let j=0;j<M.mipmaps.length;j++)F(k.__webglFramebuffer[j],w,M,i.COLOR_ATTACHMENT0,$,j);else F(k.__webglFramebuffer,w,M,i.COLOR_ATTACHMENT0,$,0);A(M)?y($):M.mipmaps.length>0&&i.texParameteri($,i.TEXTURE_MAX_LEVEL,M.mipmaps.length-1),t.unbindTexture()}w.depthBuffer&&Te(w)}function U(w){const M=w.textures;for(let k=0,ie=M.length;k<ie;k++){const q=M[k];if(A(q)&&q.mipmapsAutoUpdate===!0){const ne=b(w),he=n.get(q).__webglTexture;t.bindTexture(ne,he),y(ne),t.unbindTexture()}}}const Qe=[];function pt(w){if(w.samples>0){if(ve(w)===!1){const M=w.textures,k=w.width,ie=w.height;let q=i.COLOR_BUFFER_BIT;const ne=w.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,he=n.get(w),$=M.length>1;if($)for(let ue=0;ue<M.length;ue++)t.bindFramebuffer(i.FRAMEBUFFER,he.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+ue,i.RENDERBUFFER,null),t.bindFramebuffer(i.FRAMEBUFFER,he.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+ue,i.TEXTURE_2D,null,0);t.bindFramebuffer(i.READ_FRAMEBUFFER,he.__webglMultisampledFramebuffer),w.texture.mipmaps.length>0?t.bindFramebuffer(i.DRAW_FRAMEBUFFER,he.__webglFramebuffer[0]):t.bindFramebuffer(i.DRAW_FRAMEBUFFER,he.__webglFramebuffer);for(let ue=0;ue<M.length;ue++){if(w.resolveDepthBuffer&&(w.depthBuffer&&(q|=i.DEPTH_BUFFER_BIT),w.stencilBuffer&&w.resolveStencilBuffer&&(q|=i.STENCIL_BUFFER_BIT)),$){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,he.__webglColorRenderbuffer[ue]);const P=n.get(M[ue]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,P,0)}i.blitFramebuffer(0,0,k,ie,0,0,k,ie,q,i.NEAREST),l===!0&&(Qe.length=0,Qe.push(i.COLOR_ATTACHMENT0+ue),w.depthBuffer&&w.storeMultisampledDepthBuffer===!1&&Qe.push(ne),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,Qe))}if(t.bindFramebuffer(i.READ_FRAMEBUFFER,null),t.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),$)for(let ue=0;ue<M.length;ue++){t.bindFramebuffer(i.FRAMEBUFFER,he.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+ue,i.RENDERBUFFER,he.__webglColorRenderbuffer[ue]);const P=n.get(M[ue]).__webglTexture;t.bindFramebuffer(i.FRAMEBUFFER,he.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+ue,i.TEXTURE_2D,P,0)}t.bindFramebuffer(i.DRAW_FRAMEBUFFER,he.__webglMultisampledFramebuffer)}else if(w.depthBuffer&&w.storeMultisampledDepthBuffer===!1&&l){const M=w.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[M])}}}function mt(w){return Math.min(r.maxSamples,w.samples)}function ve(w){const M=n.get(w);return w.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&M.__useRenderToTexture!==!1}function $e(w){const M=o.render.frame;u.get(w)!==M&&(u.set(w,M),w.update())}function fe(w,M){const k=w.colorSpace,ie=w.format,q=w.type;return w.isCompressedTexture===!0||w.isVideoTexture===!0||k!==tn&&k!==pi&&(tt.getTransfer(k)===gt?(ie!==xn||q!==en)&&De("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):Xe("WebGLTextures: Unsupported texture color space:",k)),M}function Ue(w){return typeof HTMLImageElement<"u"&&w instanceof HTMLImageElement?(c.width=w.naturalWidth||w.width,c.height=w.naturalHeight||w.height):typeof VideoFrame<"u"&&w instanceof VideoFrame?(c.width=w.displayWidth,c.height=w.displayHeight):(c.width=w.width,c.height=w.height),c}this.allocateTextureUnit=ke,this.resetTextureUnits=Z,this.getTextureUnits=te,this.setTextureUnits=ye,this.setTexture2D=me,this.setTexture2DArray=Me,this.setTexture3D=Pe,this.setTextureCube=_e,this.rebindTextures=ze,this.setupRenderTarget=Ge,this.updateRenderTargetMipmap=U,this.updateMultisampleRenderTarget=pt,this.setupDepthRenderbuffer=Te,this.setupFrameBufferTexture=F,this.useMultisampledRTT=ve,this.dispose=G}function Bv(i,e){function t(n,r=pi){let s;const o=tt.getTransfer(r);if(n===en)return i.UNSIGNED_BYTE;if(n===yl)return i.UNSIGNED_SHORT_4_4_4_4;if(n===Tl)return i.UNSIGNED_SHORT_5_5_5_1;if(n===Ah)return i.UNSIGNED_INT_5_9_9_9_REV;if(n===wh)return i.UNSIGNED_INT_10F_11F_11F_REV;if(n===Eh)return i.BYTE;if(n===bh)return i.SHORT;if(n===os)return i.UNSIGNED_SHORT;if(n===Sl)return i.INT;if(n===Fn)return i.UNSIGNED_INT;if(n===ln)return i.FLOAT;if(n===Bn)return i.HALF_FLOAT;if(n===Rh)return i.ALPHA;if(n===Ch)return i.RGB;if(n===xn)return i.RGBA;if(n===vi)return i.DEPTH_COMPONENT;if(n===mi)return i.DEPTH_STENCIL;if(n===El)return i.RED;if(n===bl)return i.RED_INTEGER;if(n===Oi)return i.RG;if(n===Al)return i.RG_INTEGER;if(n===wl)return i.RGBA_INTEGER;if(n===js||n===eo||n===to||n===no)if(o===gt)if(s=e.get("WEBGL_compressed_texture_s3tc_srgb"),s!==null){if(n===js)return s.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===eo)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===to)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===no)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(s=e.get("WEBGL_compressed_texture_s3tc"),s!==null){if(n===js)return s.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===eo)return s.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===to)return s.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===no)return s.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===La||n===Ia||n===Na||n===Da)if(s=e.get("WEBGL_compressed_texture_pvrtc"),s!==null){if(n===La)return s.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===Ia)return s.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===Na)return s.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===Da)return s.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===Ua||n===Oa||n===Fa||n===Ba||n===ka||n===lo||n===Va)if(s=e.get("WEBGL_compressed_texture_etc"),s!==null){if(n===Ua||n===Oa)return o===gt?s.COMPRESSED_SRGB8_ETC2:s.COMPRESSED_RGB8_ETC2;if(n===Fa)return o===gt?s.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:s.COMPRESSED_RGBA8_ETC2_EAC;if(n===Ba)return s.COMPRESSED_R11_EAC;if(n===ka)return s.COMPRESSED_SIGNED_R11_EAC;if(n===lo)return s.COMPRESSED_RG11_EAC;if(n===Va)return s.COMPRESSED_SIGNED_RG11_EAC}else return null;if(n===Ha||n===za||n===Ga||n===Wa||n===Xa||n===qa||n===Ya||n===Ka||n===$a||n===Za||n===Ja||n===Qa||n===ja||n===el)if(s=e.get("WEBGL_compressed_texture_astc"),s!==null){if(n===Ha)return o===gt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:s.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===za)return o===gt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:s.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===Ga)return o===gt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:s.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===Wa)return o===gt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:s.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===Xa)return o===gt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:s.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===qa)return o===gt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:s.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===Ya)return o===gt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:s.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===Ka)return o===gt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:s.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===$a)return o===gt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:s.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===Za)return o===gt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:s.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===Ja)return o===gt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:s.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===Qa)return o===gt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:s.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===ja)return o===gt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:s.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===el)return o===gt?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:s.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===tl||n===nl||n===il)if(s=e.get("EXT_texture_compression_bptc"),s!==null){if(n===tl)return o===gt?s.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:s.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===nl)return s.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===il)return s.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===rl||n===sl||n===co||n===ol)if(s=e.get("EXT_texture_compression_rgtc"),s!==null){if(n===rl)return s.COMPRESSED_RED_RGTC1_EXT;if(n===sl)return s.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===co)return s.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===ol)return s.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===_r?i.UNSIGNED_INT_24_8:i[n]!==void 0?i[n]:null}return{convert:t}}const kv=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,Vv=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`;class Hv{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){const n=new Yh(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(e){if(this.texture!==null&&this.mesh===null){const t=e.cameras[0].viewport,n=new xi({vertexShader:kv,fragmentShader:Vv,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new wt(new Mr(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class zv extends Fi{constructor(e,t){super();const n=this;let r=null,s=1,o=null,a="local-floor",l=1,c=null,u=null,h=null,d=null,f=null,g=null;const v=typeof XRWebGLBinding<"u",p=new Hv,m={},x=t.getContextAttributes();let A=null,y=null;const b=[],E=[],_=new Ye;let S=null,D=null;const R=new Kt;R.viewport=new xt;const N=new Kt;N.viewport=new xt;const O=[R,N],W=new W0;let L=null,G=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(Q){let me=b[Q];return me===void 0&&(me=new ko,b[Q]=me),me.getTargetRaySpace()},this.getControllerGrip=function(Q){let me=b[Q];return me===void 0&&(me=new ko,b[Q]=me),me.getGripSpace()},this.getHand=function(Q){let me=b[Q];return me===void 0&&(me=new ko,b[Q]=me),me.getHandSpace()};function z(Q){const me=E.indexOf(Q.inputSource);if(me===-1)return;const Me=b[me];Me!==void 0&&(Me.update(Q.inputSource,Q.frame,c||o),Me.dispatchEvent({type:Q.type,data:Q.inputSource}))}function B(){r.removeEventListener("select",z),r.removeEventListener("selectstart",z),r.removeEventListener("selectend",z),r.removeEventListener("squeeze",z),r.removeEventListener("squeezestart",z),r.removeEventListener("squeezeend",z),r.removeEventListener("end",B),r.removeEventListener("inputsourceschange",ee);for(let Q=0;Q<b.length;Q++){const me=E[Q];me!==null&&(E[Q]=null,b[Q].disconnect(me))}L=null,G=null,p.reset();for(const Q in m)delete m[Q];if(e.setRenderTarget(A),f=null,d=null,h=null,r=null,y=null,ke.stop(),n.isPresenting=!1,e.setPixelRatio(S),e.setSize(_.width,_.height,!1),D!==null){const Q=D.camera;Q.fov=D.fov,Q.zoom=D.zoom,Q.updateProjectionMatrix(),D=null}n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(Q){s=Q,n.isPresenting===!0&&De("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(Q){a=Q,n.isPresenting===!0&&De("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||o},this.setReferenceSpace=function(Q){c=Q},this.getBaseLayer=function(){return d!==null?d:f},this.getBinding=function(){return h===null&&v&&(h=new XRWebGLBinding(r,t)),h},this.getFrame=function(){return g},this.getSession=function(){return r},this.setSession=async function(Q){if(r=Q,r!==null){if(A=e.getRenderTarget(),r.addEventListener("select",z),r.addEventListener("selectstart",z),r.addEventListener("selectend",z),r.addEventListener("squeeze",z),r.addEventListener("squeezestart",z),r.addEventListener("squeezeend",z),r.addEventListener("end",B),r.addEventListener("inputsourceschange",ee),x.xrCompatible!==!0&&await t.makeXRCompatible(),S=e.getPixelRatio(),e.getSize(_),v&&"createProjectionLayer"in XRWebGLBinding.prototype){let Me=null,Pe=null,_e=null;x.depth&&(_e=x.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,Me=x.stencil?mi:vi,Pe=x.stencil?_r:Fn);const Be={colorFormat:t.RGBA8,depthFormat:_e,scaleFactor:s};h=this.getBinding(),d=h.createProjectionLayer(Be),r.updateRenderState({layers:[d]}),e.setPixelRatio(1),e.setSize(d.textureWidth,d.textureHeight,!1),y=new On(d.textureWidth,d.textureHeight,{format:xn,type:en,depthTexture:new xr(d.textureWidth,d.textureHeight,Pe,void 0,void 0,void 0,void 0,void 0,void 0,Me),stencilBuffer:x.stencil,colorSpace:e.outputColorSpace,samples:x.antialias?4:0,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1,storeMultisampledDepthBuffer:d.ignoreDepthValues===!1,storeMultisampledStencilBuffer:d.ignoreDepthValues===!1})}else{const Me={antialias:x.antialias,alpha:!0,depth:x.depth,stencil:x.stencil,framebufferScaleFactor:s};f=new XRWebGLLayer(r,t,Me),r.updateRenderState({baseLayer:f}),e.setPixelRatio(1),e.setSize(f.framebufferWidth,f.framebufferHeight,!1),y=new On(f.framebufferWidth,f.framebufferHeight,{format:xn,type:en,colorSpace:e.outputColorSpace,stencilBuffer:x.stencil,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1,storeMultisampledDepthBuffer:f.ignoreDepthValues===!1,storeMultisampledStencilBuffer:f.ignoreDepthValues===!1})}y.isXRRenderTarget=!0,this.setFoveation(l),c=null,o=await r.requestReferenceSpace(a),ke.setContext(r),ke.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(r!==null)return r.environmentBlendMode},this.getDepthTexture=function(){return p.getDepthTexture()};function ee(Q){for(let me=0;me<Q.removed.length;me++){const Me=Q.removed[me],Pe=E.indexOf(Me);Pe>=0&&(E[Pe]=null,b[Pe].disconnect(Me))}for(let me=0;me<Q.added.length;me++){const Me=Q.added[me];let Pe=E.indexOf(Me);if(Pe===-1){for(let Be=0;Be<b.length;Be++)if(Be>=E.length){E.push(Me),Pe=Be;break}else if(E[Be]===null){E[Be]=Me,Pe=Be;break}if(Pe===-1)break}const _e=b[Pe];_e&&_e.connect(Me)}}function Y(Q,me){me===null?Q.matrixWorld.copy(Q.matrix):Q.matrixWorld.multiplyMatrices(me.matrixWorld,Q.matrix),Q.matrixWorldInverse.copy(Q.matrixWorld).invert()}this.updateCamera=function(Q){if(r===null)return;let me=Q.near,Me=Q.far;p.texture!==null&&(p.depthNear>0&&(me=p.depthNear),p.depthFar>0&&(Me=p.depthFar)),W.near=N.near=R.near=me,W.far=N.far=R.far=Me,(L!==W.near||G!==W.far)&&(r.updateRenderState({depthNear:W.near,depthFar:W.far}),L=W.near,G=W.far),W.layers.mask=Q.layers.mask|6,R.layers.mask=W.layers.mask&-5,N.layers.mask=W.layers.mask&-3;const Pe=Q.parent,_e=W.cameras;Y(W,Pe);for(let Be=0;Be<_e.length;Be++)Y(_e[Be],Pe);W.projectionMatrix.copy(R.projectionMatrix),W.projectionMatrixInverse.copy(R.projectionMatrixInverse),D===null&&Q.isPerspectiveCamera&&(D={camera:Q,fov:Q.fov,zoom:Q.zoom}),Z(Q,W,Pe)};function Z(Q,me,Me){Me===null?Q.matrix.copy(me.matrixWorld):(Q.matrix.copy(Me.matrixWorld),Q.matrix.invert(),Q.matrix.multiply(me.matrixWorld)),Q.matrix.decompose(Q.position,Q.quaternion,Q.scale),Q.updateMatrixWorld(!0),Q.projectionMatrix.copy(me.projectionMatrix),Q.projectionMatrixInverse.copy(me.projectionMatrixInverse),Q.isPerspectiveCamera&&(Q.fov=vr*2*Math.atan(1/Q.projectionMatrix.elements[5]),Q.zoom=1)}this.getCamera=function(){return W},this.getFoveation=function(){if(!(d===null&&f===null))return l},this.setFoveation=function(Q){l=Q,d!==null&&(d.fixedFoveation=Q),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=Q)},this.hasDepthSensing=function(){return p.texture!==null},this.getDepthSensingMesh=function(){return p.getMesh(W)},this.getCameraTexture=function(Q){return m[Q]};let te=null;function ye(Q,me){if(u=me.getViewerPose(c||o),g=me,u!==null){const Me=u.views;f!==null&&(e.setRenderTargetFramebuffer(y,f.framebuffer),e.setRenderTarget(y));let Pe=!1;Me.length!==W.cameras.length&&(W.cameras.length=0,Pe=!0);for(let Ce=0;Ce<Me.length;Ce++){const Ke=Me[Ce];let Ze=null;if(f!==null)Ze=f.getViewport(Ke);else{const st=h.getViewSubImage(d,Ke);Ze=st.viewport,Ce===0&&(e.setRenderTargetTextures(y,st.colorTexture,st.depthStencilTexture),e.setRenderTarget(y))}let He=O[Ce];He===void 0&&(He=new Kt,He.layers.enable(Ce),He.viewport=new xt,O[Ce]=He),He.matrix.fromArray(Ke.transform.matrix),He.matrix.decompose(He.position,He.quaternion,He.scale),He.projectionMatrix.fromArray(Ke.projectionMatrix),He.projectionMatrixInverse.copy(He.projectionMatrix).invert(),He.viewport.set(Ze.x,Ze.y,Ze.width,Ze.height),Ce===0&&(W.matrix.copy(He.matrix),W.matrix.decompose(W.position,W.quaternion,W.scale)),Pe===!0&&W.cameras.push(He)}const _e=r.enabledFeatures;if(_e&&_e.includes("depth-sensing")&&r.depthUsage=="gpu-optimized"&&v){h=n.getBinding();const Ce=h.getDepthInformation(Me[0]);Ce&&Ce.isValid&&Ce.texture&&p.init(Ce,r.renderState)}if(_e&&_e.includes("camera-access")&&v){e.state.unbindTexture(),h=n.getBinding();for(let Ce=0;Ce<Me.length;Ce++){const Ke=Me[Ce].camera;if(Ke){let Ze=m[Ke];Ze||(Ze=new Yh,m[Ke]=Ze);const He=h.getCameraImage(Ke);Ze.sourceTexture=He}}}}for(let Me=0;Me<b.length;Me++){const Pe=E[Me],_e=b[Me];Pe!==null&&_e!==void 0&&_e.update(Pe,me,c||o)}te&&te(Q,me),me.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:me}),g=null}const ke=new td;ke.setAnimationLoop(ye),this.setAnimationLoop=function(Q){te=Q},this.dispose=function(){}}}const Gv=new Ve,hd=new Oe;hd.set(-1,0,0,0,1,0,0,0,1);function Wv(i,e){function t(p,m){p.matrixAutoUpdate===!0&&p.updateMatrix(),m.value.copy(p.matrix)}function n(p,m){m.color.getRGB(p.fogColor.value,Kh(i)),m.isFog?(p.fogNear.value=m.near,p.fogFar.value=m.far):m.isFogExp2&&(p.fogDensity.value=m.density)}function r(p,m,x,A,y){m.isNodeMaterial?m.uniformsNeedUpdate=!1:m.isMeshBasicMaterial?s(p,m):m.isMeshLambertMaterial?(s(p,m),m.envMap&&(p.envMapIntensity.value=m.envMapIntensity)):m.isMeshToonMaterial?(s(p,m),h(p,m)):m.isMeshPhongMaterial?(s(p,m),u(p,m),m.envMap&&(p.envMapIntensity.value=m.envMapIntensity)):m.isMeshStandardMaterial?(s(p,m),d(p,m),m.isMeshPhysicalMaterial&&f(p,m,y)):m.isMeshMatcapMaterial?(s(p,m),g(p,m)):m.isMeshDepthMaterial?s(p,m):m.isMeshDistanceMaterial?(s(p,m),v(p,m)):m.isMeshNormalMaterial?s(p,m):m.isLineBasicMaterial?(o(p,m),m.isLineDashedMaterial&&a(p,m)):m.isPointsMaterial?l(p,m,x,A):m.isSpriteMaterial?c(p,m):m.isShadowMaterial?(p.color.value.copy(m.color),p.opacity.value=m.opacity):m.isShaderMaterial&&(m.uniformsNeedUpdate=!1)}function s(p,m){p.opacity.value=m.opacity,m.color&&p.diffuse.value.copy(m.color),m.emissive&&p.emissive.value.copy(m.emissive).multiplyScalar(m.emissiveIntensity),m.map&&(p.map.value=m.map,t(m.map,p.mapTransform)),m.alphaMap&&(p.alphaMap.value=m.alphaMap,t(m.alphaMap,p.alphaMapTransform)),m.bumpMap&&(p.bumpMap.value=m.bumpMap,t(m.bumpMap,p.bumpMapTransform),p.bumpScale.value=m.bumpScale,m.side===Yt&&(p.bumpScale.value*=-1)),m.normalMap&&(p.normalMap.value=m.normalMap,t(m.normalMap,p.normalMapTransform),p.normalScale.value.copy(m.normalScale),m.side===Yt&&p.normalScale.value.negate()),m.displacementMap&&(p.displacementMap.value=m.displacementMap,t(m.displacementMap,p.displacementMapTransform),p.displacementScale.value=m.displacementScale,p.displacementBias.value=m.displacementBias),m.emissiveMap&&(p.emissiveMap.value=m.emissiveMap,t(m.emissiveMap,p.emissiveMapTransform)),m.specularMap&&(p.specularMap.value=m.specularMap,t(m.specularMap,p.specularMapTransform)),m.alphaTest>0&&(p.alphaTest.value=m.alphaTest);const x=e.get(m),A=x.envMap,y=x.envMapRotation;A&&(p.envMap.value=A,p.envMapRotation.value.setFromMatrix4(Gv.makeRotationFromEuler(y)).transpose(),A.isCubeTexture&&A.isRenderTargetTexture===!1&&p.envMapRotation.value.premultiply(hd),p.reflectivity.value=m.reflectivity,p.ior.value=m.ior,p.refractionRatio.value=m.refractionRatio),m.lightMap&&(p.lightMap.value=m.lightMap,p.lightMapIntensity.value=m.lightMapIntensity,t(m.lightMap,p.lightMapTransform)),m.aoMap&&(p.aoMap.value=m.aoMap,p.aoMapIntensity.value=m.aoMapIntensity,t(m.aoMap,p.aoMapTransform))}function o(p,m){p.diffuse.value.copy(m.color),p.opacity.value=m.opacity,m.map&&(p.map.value=m.map,t(m.map,p.mapTransform))}function a(p,m){p.dashSize.value=m.dashSize,p.totalSize.value=m.dashSize+m.gapSize,p.scale.value=m.scale}function l(p,m,x,A){p.diffuse.value.copy(m.color),p.opacity.value=m.opacity,p.size.value=m.size*x,p.scale.value=A*.5,m.map&&(p.map.value=m.map,t(m.map,p.uvTransform)),m.alphaMap&&(p.alphaMap.value=m.alphaMap,t(m.alphaMap,p.alphaMapTransform)),m.alphaTest>0&&(p.alphaTest.value=m.alphaTest)}function c(p,m){p.diffuse.value.copy(m.color),p.opacity.value=m.opacity,p.rotation.value=m.rotation,m.map&&(p.map.value=m.map,t(m.map,p.mapTransform)),m.alphaMap&&(p.alphaMap.value=m.alphaMap,t(m.alphaMap,p.alphaMapTransform)),m.alphaTest>0&&(p.alphaTest.value=m.alphaTest)}function u(p,m){p.specular.value.copy(m.specular),p.shininess.value=Math.max(m.shininess,1e-4)}function h(p,m){m.gradientMap&&(p.gradientMap.value=m.gradientMap)}function d(p,m){p.metalness.value=m.metalness,m.metalnessMap&&(p.metalnessMap.value=m.metalnessMap,t(m.metalnessMap,p.metalnessMapTransform)),p.roughness.value=m.roughness,m.roughnessMap&&(p.roughnessMap.value=m.roughnessMap,t(m.roughnessMap,p.roughnessMapTransform)),m.envMap&&(p.envMapIntensity.value=m.envMapIntensity)}function f(p,m,x){p.ior.value=m.ior,m.diffuseRoughness>0&&(p.diffuseRoughness.value=m.diffuseRoughness,m.diffuseRoughnessMap&&(p.diffuseRoughnessMap.value=m.diffuseRoughnessMap,t(m.diffuseRoughnessMap,p.diffuseRoughnessMapTransform))),m.sheen>0&&(p.sheenColor.value.copy(m.sheenColor).multiplyScalar(m.sheen),p.sheenRoughness.value=m.sheenRoughness,m.sheenColorMap&&(p.sheenColorMap.value=m.sheenColorMap,t(m.sheenColorMap,p.sheenColorMapTransform)),m.sheenRoughnessMap&&(p.sheenRoughnessMap.value=m.sheenRoughnessMap,t(m.sheenRoughnessMap,p.sheenRoughnessMapTransform))),m.clearcoat>0&&(p.clearcoat.value=m.clearcoat,p.clearcoatRoughness.value=m.clearcoatRoughness,m.clearcoatMap&&(p.clearcoatMap.value=m.clearcoatMap,t(m.clearcoatMap,p.clearcoatMapTransform)),m.clearcoatRoughnessMap&&(p.clearcoatRoughnessMap.value=m.clearcoatRoughnessMap,t(m.clearcoatRoughnessMap,p.clearcoatRoughnessMapTransform)),m.clearcoatNormalMap&&(p.clearcoatNormalMap.value=m.clearcoatNormalMap,t(m.clearcoatNormalMap,p.clearcoatNormalMapTransform),p.clearcoatNormalScale.value.copy(m.clearcoatNormalScale),m.side===Yt&&p.clearcoatNormalScale.value.negate())),m.dispersion>0&&(p.dispersion.value=m.dispersion),m.retroreflectivity>0&&(p.retroreflectivity.value=m.retroreflectivity),m.iridescence>0&&(p.iridescence.value=m.iridescence,p.iridescenceIOR.value=m.iridescenceIOR,p.iridescenceThicknessMinimum.value=m.iridescenceThicknessMinimum,p.iridescenceThicknessMaximum.value=m.iridescenceThicknessMaximum,m.iridescenceMap&&(p.iridescenceMap.value=m.iridescenceMap,t(m.iridescenceMap,p.iridescenceMapTransform)),m.iridescenceThicknessMap&&(p.iridescenceThicknessMap.value=m.iridescenceThicknessMap,t(m.iridescenceThicknessMap,p.iridescenceThicknessMapTransform))),m.transmission>0&&(p.transmission.value=m.transmission,p.transmissionSamplerMap.value=x.texture,p.transmissionSamplerSize.value.set(x.width,x.height),m.transmissionMap&&(p.transmissionMap.value=m.transmissionMap,t(m.transmissionMap,p.transmissionMapTransform)),p.thickness.value=m.thickness,m.thicknessMap&&(p.thicknessMap.value=m.thicknessMap,t(m.thicknessMap,p.thicknessMapTransform)),p.attenuationDistance.value=m.attenuationDistance,p.attenuationColor.value.copy(m.attenuationColor)),m.anisotropy>0&&(p.anisotropyVector.value.set(m.anisotropy*Math.cos(m.anisotropyRotation),m.anisotropy*Math.sin(m.anisotropyRotation)),m.anisotropyMap&&(p.anisotropyMap.value=m.anisotropyMap,t(m.anisotropyMap,p.anisotropyMapTransform))),p.specularIntensity.value=m.specularIntensity,p.specularColor.value.copy(m.specularColor),m.specularColorMap&&(p.specularColorMap.value=m.specularColorMap,t(m.specularColorMap,p.specularColorMapTransform)),m.specularIntensityMap&&(p.specularIntensityMap.value=m.specularIntensityMap,t(m.specularIntensityMap,p.specularIntensityMapTransform))}function g(p,m){m.matcap&&(p.matcap.value=m.matcap)}function v(p,m){const x=e.get(m).light;p.referencePosition.value.setFromMatrixPosition(x.matrixWorld),p.nearDistance.value=x.shadow.camera.near,p.farDistance.value=x.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:r}}function Xv(i,e,t,n){let r={},s={};function o(x,A){const y=A.program;n.uniformBlockBinding(x,y,r[x.id])}function a(x,A){let y=r[x.id];y===void 0&&(g(x),y=l(x),r[x.id]=y,x.addEventListener("dispose",p));const b=A.program;n.updateUBOMapping(x,b);const E=e.render.frame;s[x.id]!==E&&(c(x),s[x.id]=E)}function l(x){const A=i.createBuffer(),y=x.__size,b=x.usage;return i.bindBuffer(i.UNIFORM_BUFFER,A),i.bufferData(i.UNIFORM_BUFFER,y,b),i.bindBuffer(i.UNIFORM_BUFFER,null),A}function c(x){const A=r[x.id],y=x.uniforms,b=x.__cache;i.bindBuffer(i.UNIFORM_BUFFER,A);for(let E=0,_=y.length;E<_;E++){const S=y[E];if(Array.isArray(S))for(let D=0,R=S.length;D<R;D++)u(S[D],E,D,b);else u(S,E,0,b)}i.bindBuffer(i.UNIFORM_BUFFER,null)}function u(x,A,y,b){if(d(x,A,y,b)===!0){const E=x.__offset,_=x.value;if(Array.isArray(_)){let S=0;for(let D=0;D<_.length;D++){const R=_[D],N=v(R,!0);h(R,x.__data,S),S+=N.storage/Float32Array.BYTES_PER_ELEMENT}}else h(_,x.__data,0);i.bufferSubData(i.UNIFORM_BUFFER,E,x.__data)}}function h(x,A,y){typeof x=="number"||typeof x=="boolean"?A[y]=x:x.isMatrix3?(A[y]=x.elements[0],A[y+1]=x.elements[1],A[y+2]=x.elements[2],A[y+3]=0,A[y+4]=x.elements[3],A[y+5]=x.elements[4],A[y+6]=x.elements[5],A[y+7]=0,A[y+8]=x.elements[6],A[y+9]=x.elements[7],A[y+10]=x.elements[8],A[y+11]=0):ArrayBuffer.isView(x)?A.set(x.subarray(0,A.length-y),y):x.toArray(A,y)}function d(x,A,y,b){const E=x.value,_=A+"_"+y;if(Array.isArray(E)){b[_]===void 0&&(b[_]=[]);const S=b[_];let D=!1;for(let R=0;R<E.length;R++)f(E[R],S,R)===!0&&(D=!0);return D}return f(E,b,_)}function f(x,A,y){if(A[y]===void 0)return typeof x=="number"||typeof x=="boolean"?A[y]=x:ArrayBuffer.isView(x)?A[y]=x.slice():A[y]=x.clone(),!0;{const b=A[y];if(typeof x=="number"||typeof x=="boolean"){if(b!==x)return A[y]=x,!0}else{if(ArrayBuffer.isView(x))return!0;if(b.equals(x)===!1)return b.copy(x),!0}}return!1}function g(x){const A=x.uniforms;let y=0;const b=16;for(let _=0,S=A.length;_<S;_++){const D=Array.isArray(A[_])?A[_]:[A[_]];for(let R=0,N=D.length;R<N;R++){const O=D[R],W=Array.isArray(O.value)?O.value:[O.value],L=Array.isArray(A[_])||Array.isArray(O.value);let G=y;for(let B=0,ee=W.length;B<ee;B++){const Y=W[B],Z=v(Y,L),te=y%b,ye=te%Z.boundary,ke=te+ye;y+=ye,ke!==0&&b-ke<Z.storage&&(y+=b-ke),B===0&&(G=y),y+=Z.storage}const z=O.type==="int"?Int32Array:O.type==="uint"?Uint32Array:Float32Array;O.__data=new z((y-G)/Float32Array.BYTES_PER_ELEMENT),O.__offset=G}}const E=y%b;return E>0&&(y+=b-E),x.__size=y,x.__cache={},this}function v(x,A){const y={boundary:0,storage:0};return typeof x=="number"||typeof x=="boolean"?(y.boundary=4,y.storage=4):x.isVector2?(y.boundary=8,y.storage=8):x.isVector3||x.isColor?(y.boundary=16,y.storage=12):x.isVector4?(y.boundary=16,y.storage=16):x.isMatrix3?(y.boundary=16,y.storage=48):x.isMatrix4?(y.boundary=16,y.storage=64):x.isTexture?De("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(x)?(y.boundary=16,y.storage=x.byteLength):De("WebGLRenderer: Unsupported uniform value type.",x),A===!0&&(y.boundary=16,y.storage=Math.ceil(y.storage/16)*16),y}function p(x){const A=x.target;A.removeEventListener("dispose",p),i.deleteBuffer(r[A.id]),delete r[A.id],delete s[A.id]}function m(){for(const x in r)i.deleteBuffer(r[x]);r={},s={}}return{bind:o,update:a,dispose:m}}const qv=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]);let Rn=null;function Yv(){return Rn===null&&(Rn=new Nl(qv,16,16,Oi,Bn),Rn.name="DFG_LUT",Rn.minFilter=Bt,Rn.magFilter=Bt,Rn.wrapS=Dn,Rn.wrapT=Dn,Rn.generateMipmaps=!1,Rn.needsUpdate=!0),Rn}class Kv{constructor(e={}){const{canvas:t=yf(),context:n=null,depth:r=!0,stencil:s=!1,alpha:o=!1,antialias:a=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:u="default",failIfMajorPerformanceCaveat:h=!1,reversedDepthBuffer:d=!1,outputBufferType:f=en}=e;this.isWebGLRenderer=!0;let g;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");g=n.getContextAttributes().alpha}else g=o;const v=f,p=new Set([wl,Al,bl]),m=new Set([en,Fn,os,_r,yl,Tl]),x=new Uint32Array(4),A=new Int32Array(4),y={textures:[],min:[],max:[],resolution:[]};let b=null,E=null;const _=[],S=[];let D=null;this.domElement=t,this.debug={checkShaderErrors:!0,diagnostics:{keywords:!1},onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=jn,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const R=this;let N=!1,O=null,W=null,L=null,G=null;this._outputColorSpace=Pt;let z=0,B=0,ee=null,Y=-1,Z=null;const te=new xt,ye=new xt;let ke=null;const Q=new Ne(0);let me=0,Me=t.width,Pe=t.height,_e=1,Be=null,dt=null;const Ce=new xt(0,0,Me,Pe),Ke=new xt(0,0,Me,Pe);let Ze=!1;const He=new hs,st=new Dl;let et=!1,ot=!1;const F=new Ve,re=new C,oe=new xt,Te={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let ze=!1;function Ge(){return ee===null?_e:1}let U=n;function Qe(T,I){return t.getContext(T,I)}let pt,mt,ve,$e,fe,Ue,w,M,k,ie,q,ne,he,$,j,ue,P,J,K,le,ae,ce,be;try{const T={alpha:!0,depth:r,stencil:s,antialias:a,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:u,failIfMajorPerformanceCaveat:h};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${Ui}`),t.addEventListener("webglcontextlost",Ie,!1),t.addEventListener("webglcontextrestored",We,!1),t.addEventListener("webglcontextcreationerror",de,!1),U===null){const I="webgl2";if(U=Qe(I,T),U===null)throw Qe(I)?new Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes."):new Error("THREE.WebGLRenderer: Error creating WebGL context.")}Ae()}catch(T){throw t.removeEventListener("webglcontextlost",Ie,!1),t.removeEventListener("webglcontextrestored",We,!1),t.removeEventListener("webglcontextcreationerror",de,!1),Xe("WebGLRenderer: "+T.message),T}function Ae(){pt=new Jg(U),pt.init(),ae=new Bv(U,pt),mt=new Vg(U,pt,e,ae),ve=new Ov(U,pt),mt.reversedDepthBuffer&&d&&ve.buffers.depth.setReversed(!0),W=U.createFramebuffer(),L=U.createFramebuffer(),G=U.createFramebuffer(),$e=new e_(U),fe=new yv,Ue=new Fv(U,pt,ve,fe,mt,ae,$e),w=new Zg(R),M=new np(U),ce=new Bg(U,M),k=new Qg(U,M,$e,ce),ie=new n_(U,k,M,ce,$e),J=new t_(U,mt,Ue),j=new Hg(fe),q=new Sv(R,w,pt,mt,ce,j),ne=new Wv(R,fe),he=new Ev,$=new Pv(pt),P=new Fg(R,w,ve,ie,g,l),ue=new Uv(R,ie,mt),be=new Xv(U,$e,mt,ve),K=new kg(U,pt,$e),le=new jg(U,pt,$e),$e.programs=q.programs,R.capabilities=mt,R.extensions=pt,R.properties=fe,R.renderLists=he,R.shadowMap=ue,R.state=ve,R.info=$e}v!==en&&(D=new r_(v,t.width,t.height,a,r,s));const se=new zv(R,U);this.xr=se,this.getContext=function(){return U},this.getContextAttributes=function(){return U.getContextAttributes()},this.forceContextLoss=function(){const T=pt.get("WEBGL_lose_context");T&&T.loseContext()},this.forceContextRestore=function(){const T=pt.get("WEBGL_lose_context");T&&T.restoreContext()},this.getPixelRatio=function(){return _e},this.setPixelRatio=function(T){T!==void 0&&(_e=T,this.setSize(Me,Pe,!1))},this.getSize=function(T){return T.set(Me,Pe)},this.setSize=function(T,I,X=!0){if(se.isPresenting){De("WebGLRenderer: Can't change size while VR device is presenting.");return}Me=T,Pe=I,t.width=Math.floor(T*_e),t.height=Math.floor(I*_e),X===!0&&(t.style.width=T+"px",t.style.height=I+"px"),D!==null&&D.setSize(t.width,t.height),this.setViewport(0,0,T,I)},this.getDrawingBufferSize=function(T){return T.set(Me*_e,Pe*_e).floor()},this.setDrawingBufferSize=function(T,I,X){Me=T,Pe=I,_e=X,t.width=Math.floor(T*X),t.height=Math.floor(I*X),this.setViewport(0,0,T,I)},this.setEffects=function(T){if(v===en){Xe("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(T){for(let I=0;I<T.length;I++)if(T[I].isOutputPass===!0){De("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}D.setEffects(T||[])},this.getCurrentViewport=function(T){return T.copy(te)},this.getViewport=function(T){return T.copy(Ce)},this.setViewport=function(T,I,X,V){T.isVector4?Ce.set(T.x,T.y,T.z,T.w):Ce.set(T,I,X,V),ve.viewport(te.copy(Ce).multiplyScalar(Ge()).round())},this.getScissor=function(T){return T.copy(Ke)},this.setScissor=function(T,I,X,V){T.isVector4?Ke.set(T.x,T.y,T.z,T.w):Ke.set(T,I,X,V),ve.scissor(ye.copy(Ke).multiplyScalar(Ge()).round())},this.getScissorTest=function(){return Ze},this.setScissorTest=function(T){ve.setScissorTest(Ze=T)},this.setOpaqueSort=function(T){Be=T},this.setTransparentSort=function(T){dt=T},this.getClearColor=function(T){return T.copy(P.getClearColor())},this.setClearColor=function(){P.setClearColor(...arguments)},this.getClearAlpha=function(){return P.getClearAlpha()},this.setClearAlpha=function(){P.setClearAlpha(...arguments)},this.clear=function(T=!0,I=!0,X=!0){let V=0;if(T){let H=!1;if(ee!==null){const ge=ee.texture.format;H=p.has(ge)}if(H){const ge=ee.texture.type,Ee=m.has(ge),pe=P.getClearColor(),Se=P.getClearAlpha(),Le=pe.r,qe=pe.g,it=pe.b;Ee?(x[0]=Le,x[1]=qe,x[2]=it,x[3]=Se,U.clearBufferuiv(U.COLOR,0,x)):(A[0]=Le,A[1]=qe,A[2]=it,A[3]=Se,U.clearBufferiv(U.COLOR,0,A))}else V|=U.COLOR_BUFFER_BIT}I&&(V|=U.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),X&&(V|=U.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),V!==0&&U.clear(V)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(T){T.setRenderer(this),O=T},this.dispose=function(){t.removeEventListener("webglcontextlost",Ie,!1),t.removeEventListener("webglcontextrestored",We,!1),t.removeEventListener("webglcontextcreationerror",de,!1),P.dispose(),he.dispose(),$.dispose(),Ue.dispose(),fe.dispose(),w.dispose(),ie.dispose(),k.dispose(),ce.dispose(),be.dispose(),q.dispose(),se.dispose(),se.removeEventListener("sessionstart",Vi),se.removeEventListener("sessionend",Cr),hn.stop()};function Ie(T){T.preventDefault(),fo("WebGLRenderer: Context Lost."),N=!0}function We(){fo("WebGLRenderer: Context Restored."),N=!1;const T=$e.autoReset,I=ue.enabled,X=ue.autoUpdate,V=ue.needsUpdate,H=ue.type;Ae(),$e.autoReset=T,ue.enabled=I,ue.autoUpdate=X,ue.needsUpdate=V,ue.type=H}function de(T){Xe("WebGLRenderer: A WebGL context could not be created. Reason: ",T.statusMessage)}function at(T){const I=T.target;I.removeEventListener("dispose",at),bt(I)}function bt(T){nn(T),fe.remove(T)}function nn(T){const I=fe.get(T).programs;I!==void 0&&(I.forEach(function(X){q.releaseProgram(X)}),T.isShaderMaterial&&q.releaseShaderCache(T))}this.renderBufferDirect=function(T,I,X,V,H,ge){I===null&&(I=Te);const Ee=H.isMesh&&H.matrixWorld.determinantAffine()<0,pe=Zt(T,I,X,V,H);ve.setMaterial(V,Ee);let Se=X.index,Le=1;if(V.wireframe===!0){if(Se=k.getWireframeAttribute(X),Se===void 0)return;Le=2}const qe=X.drawRange,it=X.attributes.position;let we=qe.start*Le,rt=(qe.start+qe.count)*Le;ge!==null&&(we=Math.max(we,ge.start*Le),rt=Math.min(rt,(ge.start+ge.count)*Le)),Se!==null?(we=Math.max(we,0),rt=Math.min(rt,Se.count)):it!=null&&(we=Math.max(we,0),rt=Math.min(rt,it.count));const Rt=rt-we;if(Rt<0||Rt===1/0)return;ce.setup(H,V,pe,X,Se);let St,Mt=K;if(Se!==null&&(St=M.get(Se),Mt=le,Mt.setIndex(St)),H.isMesh)V.wireframe===!0?(ve.setLineWidth(V.wireframeLinewidth*Ge()),Mt.setMode(U.LINES)):Mt.setMode(U.TRIANGLES);else if(H.isLine){let Vt=V.linewidth;Vt===void 0&&(Vt=1),ve.setLineWidth(Vt*Ge()),H.isLineSegments?Mt.setMode(U.LINES):H.isLineLoop?Mt.setMode(U.LINE_LOOP):Mt.setMode(U.LINE_STRIP)}else H.isPoints?Mt.setMode(U.POINTS):H.isSprite&&Mt.setMode(U.TRIANGLES);if(H.isBatchedMesh)if(pt.get("WEBGL_multi_draw"))Mt.renderMultiDraw(H._multiDrawStarts,H._multiDrawCounts,H._multiDrawCount);else{const Vt=H._multiDrawStarts,Re=H._multiDrawCounts,Wt=H._multiDrawCount,ht=Se?M.get(Se).bytesPerElement:1,yi=fe.get(V).currentProgram.getUniforms();for(let Ht=0;Ht<Wt;Ht++)yi.setValue(U,"_gl_DrawID",Ht),Mt.render(Vt[Ht]/ht,Re[Ht])}else if(H.isInstancedMesh)Mt.renderInstances(we,Rt,H.count);else if(X.isInstancedBufferGeometry){const Vt=X._maxInstanceCount!==void 0?X._maxInstanceCount:1/0,Re=Math.min(X.instanceCount,Vt);Mt.renderInstances(we,Rt,Re)}else Mt.render(we,Rt)};function cn(T,I,X,V){O!==null&&T.isNodeMaterial&&O.setObject(V,T),et===!0&&j.setState(T,X,!1),T.transparent===!0&&T.side===jt&&T.forceSinglePass===!1?(T.side=Yt,T.needsUpdate=!0,bn(T,I,V),T.side=gi,T.needsUpdate=!0,bn(T,I,V),T.side=jt):bn(T,I,V)}this.compile=function(T,I,X=null){X===null&&(X=T),O!==null&&O.renderStart(T,I,X),E=$.get(X),E.init(I),S.push(E),X.traverseVisible(function(H){H.isLight&&H.layers.test(I.layers)&&(E.pushLight(H),H.castShadow&&E.pushShadow(H))}),T!==X&&T.traverseVisible(function(H){H.isLight&&H.layers.test(I.layers)&&(E.pushLight(H),H.castShadow&&E.pushShadow(H))}),E.setupLights(),O!==null&&O.updateLights(E.state.lightsArray),ot=this.localClippingEnabled,et=j.init(this.clippingPlanes,ot),et===!0&&j.setGlobalState(this.clippingPlanes,I),O!==null&&ue.render(E.state.shadowsArray,X,I);const V=new Set;return T.traverse(function(H){if(!(H.isMesh||H.isPoints||H.isLine||H.isSprite))return;const ge=H.material;if(ge)if(Array.isArray(ge))for(let Ee=0;Ee<ge.length;Ee++){const pe=ge[Ee];cn(pe,X,I,H),V.add(pe)}else cn(ge,X,I,H),V.add(ge)}),E=S.pop(),O!==null&&O.renderEnd(),V},this.compileAsync=function(T,I,X=null){const V=this.compile(T,I,X);return new Promise(H=>{function ge(){if(V.forEach(function(Ee){const Se=fe.get(Ee).currentProgram;(Se===void 0||Se.isReady())&&V.delete(Ee)}),V.size===0){H(T);return}setTimeout(ge,10)}pt.get("KHR_parallel_shader_compile")!==null?ge():setTimeout(ge,10)})};let un=null;function Rr(T){un&&un(T)}function Vi(){hn.stop()}function Cr(){hn.start()}const hn=new td;hn.setAnimationLoop(Rr),typeof self<"u"&&hn.setContext(self),this.setAnimationLoop=function(T){un=T,se.setAnimationLoop(T),T===null?hn.stop():hn.start()},se.addEventListener("sessionstart",Vi),se.addEventListener("sessionend",Cr),this.render=function(T,I){if(I!==void 0&&I.isCamera!==!0){Xe("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(N===!0)return;O!==null&&O.renderStart(T,I);const X=se.enabled===!0&&se.isPresenting===!0,V=D!==null&&(ee===null||X)&&D.begin(R,ee);if(T.matrixWorldAutoUpdate===!0&&T.updateMatrixWorld(),I.parent===null&&I.matrixWorldAutoUpdate===!0&&I.updateMatrixWorld(),se.enabled===!0&&se.isPresenting===!0&&(D===null||D.isCompositing()===!1)&&(se.cameraAutoUpdate===!0&&se.updateCamera(I),I=se.getCamera()),T.isScene===!0&&T.onBeforeRender(R,T,I,ee),E=$.get(T,S.length),E.init(I),E.state.textureUnits=Ue.getTextureUnits(),S.push(E),F.multiplyMatrices(I.projectionMatrix,I.matrixWorldInverse),I.isArrayCamera?st.setFromArrayCamera(I):He.setFromProjectionMatrix(F,Mn,I.reversedDepth),ot=this.localClippingEnabled,et=j.init(this.clippingPlanes,ot),b=he.get(T,_.length),b.init(),_.push(b),this.info.render.frame++,se.enabled===!0&&se.isPresenting===!0){const Ee=R.xr.getDepthSensingMesh();Ee!==null&&ni(Ee,I,-1/0,R.sortObjects)}ni(T,I,0,R.sortObjects),b.finish(),O!==null&&O.updateLights(E.state.lightsArray),R.sortObjects===!0&&b.sort(Be,dt),ze=se.enabled===!1||se.isPresenting===!1||se.hasDepthSensing()===!1,ze&&P.addToRenderList(b,T),this.info.autoReset===!0&&this.info.reset(),et===!0&&j.beginShadows();const H=E.state.shadowsArray;if(ue.render(H,T,I),et===!0&&j.endShadows(),(V&&D.hasRenderPass())===!1){const Ee=b.opaque,pe=b.transmissive;if(E.setupLights(),I.isArrayCamera){const Se=I.cameras;if(pe.length>0)for(let Le=0,qe=Se.length;Le<qe;Le++){const it=Se[Le];Mi(Ee,pe,T,it)}ze&&P.render(T);for(let Le=0,qe=Se.length;Le<qe;Le++){const it=Se[Le];Hi(b,T,it,it.viewport)}}else pe.length>0&&Mi(Ee,pe,T,I),ze&&P.render(T),Hi(b,T,I)}ee!==null&&B===0&&(Ue.updateMultisampleRenderTarget(ee),Ue.updateRenderTargetMipmap(ee)),V&&D.end(R),T.isScene===!0&&T.onAfterRender(R,T,I),ce.resetDefaultState(),Y=-1,Z=null,S.pop(),S.length>0?(E=S[S.length-1],Ue.setTextureUnits(E.state.textureUnits),et===!0&&j.setGlobalState(R.clippingPlanes,E.state.camera)):E=null,_.pop(),_.length>0?b=_[_.length-1]:b=null,O!==null&&O.renderEnd()};function ni(T,I,X,V){if(T.visible===!1)return;if(T.layers.test(I.layers)){if(T.isGroup)X=T.renderOrder;else if(T.isLOD)T.autoUpdate===!0&&T.update(I);else if(T.isLight)E.pushLight(T),T.castShadow&&E.pushShadow(T);else if(T.isSprite){const Ee=I.isArrayCamera?st:He;if(!T.frustumCulled||T.intersectsFrustum(Ee)){V&&oe.setFromMatrixPosition(T.matrixWorld).applyMatrix4(F);const pe=ie.update(T),Se=T.material;Se.visible&&b.push(T,pe,Se,X,oe.z,null,I)}}else if(T.isMesh||T.isLine||T.isPoints){const Ee=I.isArrayCamera?st:He;if(!T.frustumCulled||T.intersectsFrustum(Ee)){const pe=ie.update(T),Se=T.material;if(V&&(T.boundingSphere!==void 0?(T.boundingSphere===null&&T.computeBoundingSphere(),oe.copy(T.boundingSphere.center)):(pe.boundingSphere===null&&pe.computeBoundingSphere(),oe.copy(pe.boundingSphere.center)),oe.applyMatrix4(T.matrixWorld).applyMatrix4(F)),Array.isArray(Se)){const Le=pe.groups;for(let qe=0,it=Le.length;qe<it;qe++){const we=Le[qe],rt=Se[we.materialIndex];rt&&rt.visible&&b.push(T,pe,rt,X,oe.z,we,I)}}else Se.visible&&b.push(T,pe,Se,X,oe.z,null,I)}}}const ge=T.children;for(let Ee=0,pe=ge.length;Ee<pe;Ee++)ni(ge[Ee],I,X,V)}function Hi(T,I,X,V){const{opaque:H,transmissive:ge,transparent:Ee}=T;E.setupLightsView(X),et===!0&&j.setGlobalState(R.clippingPlanes,X),V&&ve.viewport(te.copy(V)),H.length>0&&dn(H,I,X),ge.length>0&&dn(ge,I,X),Ee.length>0&&dn(Ee,I,X),ve.buffers.depth.setTest(!0),ve.buffers.depth.setMask(!0),ve.buffers.color.setMask(!0),ve.setPolygonOffset(!1)}function Mi(T,I,X,V){if((X.isScene===!0?X.overrideMaterial:null)!==null)return;if(E.state.transmissionRenderTarget[V.id]===void 0){const we=pt.has("EXT_color_buffer_half_float")||pt.has("EXT_color_buffer_float");E.state.transmissionRenderTarget[V.id]=new On(1,1,{generateMipmaps:!0,type:we?Bn:en,minFilter:vn,samples:Math.max(4,mt.samples),stencilBuffer:s,resolveDepthBuffer:!1,resolveStencilBuffer:!1,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,colorSpace:tt.workingColorSpace})}const ge=E.state.transmissionRenderTarget[V.id],Ee=V.viewport||te;ge.setSize(Ee.z*R.transmissionResolutionScale,Ee.w*R.transmissionResolutionScale);const pe=R.getRenderTarget(),Se=R.getActiveCubeFace(),Le=R.getActiveMipmapLevel();R.setRenderTarget(ge),R.getClearColor(Q),me=R.getClearAlpha(),me<1&&R.setClearColor(16777215,.5),R.clear(),ze&&P.render(X);const qe=R.toneMapping;R.toneMapping=jn;const it=V.viewport;if(V.viewport!==void 0&&(V.viewport=void 0),E.setupLightsView(V),et===!0&&j.setGlobalState(R.clippingPlanes,V),dn(T,X,V),Ue.updateMultisampleRenderTarget(ge),Ue.updateRenderTargetMipmap(ge),pt.has("WEBGL_multisampled_render_to_texture")===!1){let we=!1;for(let rt=0,Rt=I.length;rt<Rt;rt++){const St=I[rt],{object:Mt,geometry:Vt,material:Re,group:Wt}=St;if(Re.side===jt&&Mt.layers.test(V.layers)){const ht=Re.side;Re.side=Yt,Re.needsUpdate=!0,At(Mt,X,V,Vt,Re,Wt),Re.side=ht,Re.needsUpdate=!0,we=!0}}we===!0&&(Ue.updateMultisampleRenderTarget(ge),Ue.updateRenderTargetMipmap(ge))}R.setRenderTarget(pe,Se,Le),R.setClearColor(Q,me),it!==void 0&&(V.viewport=it),R.toneMapping=qe}function dn(T,I,X){const V=I.isScene===!0?I.overrideMaterial:null;for(let H=0,ge=T.length;H<ge;H++){const Ee=T[H],{object:pe,geometry:Se,group:Le}=Ee;let qe=Ee.material;qe.allowOverride===!0&&V!==null&&(qe=V),pe.layers.test(X.layers)&&At(pe,I,X,Se,qe,Le)}}function At(T,I,X,V,H,ge){O!==null&&H.isNodeMaterial&&O.setObject(T,H),T.onBeforeRender(R,I,X,V,H,ge),T.modelViewMatrix.multiplyMatrices(X.matrixWorldInverse,T.matrixWorld),T.normalMatrix.getNormalMatrix(T.modelViewMatrix),H.onBeforeRender(R,I,X,V,T,ge),H.transparent===!0&&H.side===jt&&H.forceSinglePass===!1?(H.side=Yt,H.needsUpdate=!0,R.renderBufferDirect(X,I,V,H,T,ge),H.side=gi,H.needsUpdate=!0,R.renderBufferDirect(X,I,V,H,T,ge),H.side=jt):R.renderBufferDirect(X,I,V,H,T,ge),T.onAfterRender(R,I,X,V,H,ge)}function ii(T){let I=0;for(const X of T)X.texture!==null&&I++;return I}function bn(T,I,X){I.isScene!==!0&&(I=Te);const V=fe.get(T),H=E.state.lights,ge=E.state.shadowsArray,Ee=H.state.version,pe=q.getParameters(T,H.state,ge,I,X,E.state.lightProbeGridArray),Se=q.getProgramCacheKey(pe);let Le=V.programs;V.environment=T.isMeshStandardMaterial||T.isMeshLambertMaterial||T.isMeshPhongMaterial?I.environment:null,V.fog=I.fog;const qe=T.isMeshStandardMaterial||T.isMeshLambertMaterial&&!T.envMap||T.isMeshPhongMaterial&&!T.envMap;V.envMap=w.get(T.envMap||V.environment,qe),V.envMapRotation=V.environment!==null&&T.envMap===null?I.environmentRotation:T.envMapRotation,Le===void 0&&(T.addEventListener("dispose",at),Le=new Map,V.programs=Le,V.programVariants=new Map);let it=Le.get(Se);if(it!==void 0){if(V.currentProgram===it&&V.lightsStateVersion===Ee)return zi(T,pe),it}else pe.uniforms=q.getUniforms(T),O!==null&&T.isNodeMaterial&&O.build(T,X,pe),T.onBeforeCompile(pe,R),it=q.acquireProgram(pe,Se),Le.set(Se,it),V.uniforms=pe.uniforms;const we=V.uniforms;return(!T.isShaderMaterial&&!T.isRawShaderMaterial||T.clipping===!0)&&(we.clippingPlanes=j.uniform),zi(T,pe),V.needsLights=Si(T),V.lightsStateVersion=Ee,V.needsLights&&(we.ambientLightColor.value=H.state.ambient,we.lightProbe.value=H.state.probe,we.sunLights.value=H.state.sun,we.sunLightShadows.value=H.state.sunShadow,we.directionalLights.value=H.state.directional,we.directionalLightShadows.value=H.state.directionalShadow,we.spotLights.value=H.state.spot,we.spotLightShadows.value=H.state.spotShadow,we.rectAreaLights.value=H.state.rectArea,we.ltc_1.value=H.state.rectAreaLTC1,we.ltc_2.value=H.state.rectAreaLTC2,we.pointLights.value=H.state.point,we.pointLightShadows.value=H.state.pointShadow,we.hemisphereLights.value=H.state.hemi,we.sunShadowMatrix.value=H.state.sunShadowMatrix,we.sunShadowCascade.value=H.state.sunShadowCascade,we.directionalShadowMatrix.value=H.state.directionalShadowMatrix,we.spotLightMatrix.value=H.state.spotLightMatrix,we.spotLightMap.value=H.state.spotLightMap,we.pointShadowMatrix.value=H.state.pointShadowMatrix),V.numLightProbeGrids=ii(E.state.lightProbeGridArray),V.currentProgram=it,V.uniformsList=null,it}function Pr(T,I,X,V,H){const ge=fe.get(T),Ee=ge.currentProgram.id+","+V+","+H;let pe=ge.programVariants.get(Ee);return pe===void 0?(pe=bn(T,I,X),ge.programVariants.set(Ee,pe)):(ge.currentProgram=pe,ge.uniformsList=null,ge.outputColorSpace=V,ge.toneMapping=H),pe}function xs(T){if(T.uniformsList===null){const I=T.currentProgram.getUniforms();T.uniformsList=io.seqWithValue(I.seq,T.uniforms)}return T.uniformsList}function zi(T,I){const X=fe.get(T);X.outputColorSpace=I.outputColorSpace,X.batching=I.batching,X.batchingColor=I.batchingColor,X.instancing=I.instancing,X.instancingColor=I.instancingColor,X.instancingMorph=I.instancingMorph,X.skinning=I.skinning,X.morphTargets=I.morphTargets,X.morphNormals=I.morphNormals,X.morphColors=I.morphColors,X.morphTargetsCount=I.morphTargetsCount,X.numClippingPlanes=I.numClippingPlanes,X.numIntersection=I.numClipIntersection,X.vertexAlphas=I.vertexAlphas,X.vertexTangents=I.vertexTangents,X.toneMapping=I.toneMapping}function Zt(T,I,X,V,H){I.isScene!==!0&&(I=Te),Ue.resetTextureUnits();const ge=I.fog,Ee=V.isMeshStandardMaterial||V.isMeshLambertMaterial||V.isMeshPhongMaterial?I.environment:null,pe=ee===null?R.outputColorSpace:ee.isXRRenderTarget===!0?ee.texture.colorSpace:tt.workingColorSpace,Se=V.isMeshStandardMaterial||V.isMeshLambertMaterial&&!V.envMap||V.isMeshPhongMaterial&&!V.envMap,Le=w.get(V.envMap||Ee,Se),qe=V.vertexColors===!0&&!!X.attributes.color&&X.attributes.color.itemSize===4,it=!!X.attributes.tangent&&(!!V.normalMap||V.anisotropy>0),we=!!X.morphAttributes.position,rt=!!X.morphAttributes.normal,Rt=!!X.morphAttributes.color;let St=jn;V.toneMapped&&(ee===null||ee.isXRRenderTarget===!0)&&(St=R.toneMapping);const Mt=X.morphAttributes.position||X.morphAttributes.normal||X.morphAttributes.color,Vt=Mt!==void 0?Mt.length:0,Re=fe.get(V),Wt=E.state.lights;if(et===!0&&(ot===!0||T!==Z)){const yt=T===Z&&V.id===Y;j.setState(V,T,yt)}let ht=!1,yi=!1;V.version===Re.__version?Re.needsLights&&Re.lightsStateVersion!==Wt.state.version||H.isBatchedMesh&&Re.batching===!1||!H.isBatchedMesh&&Re.batching===!0||H.isBatchedMesh&&Re.batchingColor===!0&&H._colorsTexture===null||H.isBatchedMesh&&Re.batchingColor===!1&&H._colorsTexture!==null||H.isInstancedMesh&&Re.instancing===!1||!H.isInstancedMesh&&Re.instancing===!0||H.isSkinnedMesh&&Re.skinning===!1||!H.isSkinnedMesh&&Re.skinning===!0||H.isInstancedMesh&&Re.instancingColor===!0&&H.instanceColor===null||H.isInstancedMesh&&Re.instancingColor===!1&&H.instanceColor!==null||H.isInstancedMesh&&Re.instancingMorph===!0&&H.morphTexture===null||H.isInstancedMesh&&Re.instancingMorph===!1&&H.morphTexture!==null||Re.envMap!==Le||V.fog===!0&&Re.fog!==ge||Re.numClippingPlanes!==void 0&&(Re.numClippingPlanes!==j.numPlanes||Re.numIntersection!==j.numIntersection)||Re.vertexAlphas!==qe||Re.vertexTangents!==it||Re.morphTargets!==we||Re.morphNormals!==rt||Re.morphColors!==Rt||Re.morphTargetsCount!==Vt||Re.numLightProbeGrids!==ii(E.state.lightProbeGridArray)?ht=!0:(Re.outputColorSpace!==pe||Re.toneMapping!==St)&&(yi=!0):(ht=!0,Re.__version=V.version);let Ht=Re.currentProgram;(ht===!0||yi===!0)&&(Ht=yi===!0?Pr(V,I,H,pe,St):bn(V,I,H),O&&V.isNodeMaterial&&O.onUpdateProgram(V,Ht,Re));let Ms=!1,ri=!1,Ti=!1;const lt=Ht.getUniforms(),kt=Re.uniforms;if(ve.useProgram(Ht.program)&&(Ms=!0,ri=!0,Ti=!0),V.id!==Y&&(Y=V.id,ri=!0),Ms||Z!==T){ve.buffers.depth.getReversed()&&T.reversedDepth!==!0&&(T._reversedDepth=!0,T.updateProjectionMatrix()),lt.setValue(U,"projectionMatrix",T.projectionMatrix),lt.setValue(U,"viewMatrix",T.matrixWorldInverse);const Ot=lt.map.cameraPosition;Ot!==void 0&&Ot.setValue(U,re.setFromMatrixPosition(T.matrixWorld)),mt.logarithmicDepthBuffer&&lt.setValue(U,"logDepthBufFC",2/(Math.log(T.far+1)/Math.LN2)),(V.isMeshPhongMaterial||V.isMeshToonMaterial||V.isMeshLambertMaterial||V.isMeshBasicMaterial||V.isMeshStandardMaterial||V.isShaderMaterial)&&lt.setValue(U,"isOrthographic",T.isOrthographicCamera===!0),Z!==T&&(Z=T,ri=!0,Ti=!0)}if(Re.needsLights&&(Wt.state.sunShadowMap.length>0&&lt.setValue(U,"sunShadowMap",Wt.state.sunShadowMap,Ue),Wt.state.directionalShadowMap.length>0&&lt.setValue(U,"directionalShadowMap",Wt.state.directionalShadowMap,Ue),Wt.state.spotShadowMap.length>0&&lt.setValue(U,"spotShadowMap",Wt.state.spotShadowMap,Ue),Wt.state.pointShadowMap.length>0&&lt.setValue(U,"pointShadowMap",Wt.state.pointShadowMap,Ue)),H.isSkinnedMesh){lt.setOptional(U,H,"bindMatrix"),lt.setOptional(U,H,"bindMatrixInverse");const yt=H.skeleton;yt&&(yt.boneTexture===null&&yt.computeBoneTexture(),lt.setValue(U,"boneTexture",yt.boneTexture,Ue))}H.isBatchedMesh&&(lt.setOptional(U,H,"batchingTexture"),lt.setValue(U,"batchingTexture",H._matricesTexture,Ue),lt.setOptional(U,H,"batchingIdTexture"),lt.setValue(U,"batchingIdTexture",H._indirectTexture,Ue),lt.setOptional(U,H,"batchingColorTexture"),H._colorsTexture!==null&&lt.setValue(U,"batchingColorTexture",H._colorsTexture,Ue));const fn=X.morphAttributes;if((fn.position!==void 0||fn.normal!==void 0||fn.color!==void 0)&&J.update(H,X,Ht),(ri||Re.receiveShadow!==H.receiveShadow)&&(Re.receiveShadow=H.receiveShadow,lt.setValue(U,"receiveShadow",H.receiveShadow)),(V.isMeshStandardMaterial||V.isMeshLambertMaterial||V.isMeshPhongMaterial)&&V.envMap===null&&I.environment!==null&&(kt.envMapIntensity.value=I.environmentIntensity),kt.dfgLUT!==void 0&&(kt.dfgLUT.value=Yv()),ri){if(lt.setValue(U,"toneMappingExposure",R.toneMappingExposure),Re.needsLights&&zn(kt,Ti),ge&&V.fog===!0&&ne.refreshFogUniforms(kt,ge),ne.refreshMaterialUniforms(kt,V,_e,Pe,E.state.transmissionRenderTarget[T.id]),Re.needsLights&&Re.numLightProbeGrids>0){const yt=y;let Ot=0;for(const Gn of E.state.lightProbeGridArray)Gn.texture!==null&&(yt.textures[Ot]=Gn.texture,yt.min[Ot]=Gn.boundingBox.min,yt.max[Ot]=Gn.boundingBox.max,yt.resolution[Ot]=Gn.resolution,Ot++);for(const Gn in yt)yt[Gn].length=Ot;kt.probesSH.value=yt.textures,kt.probesMin.value=yt.min,kt.probesMax.value=yt.max,kt.probesResolution.value=yt.resolution}io.upload(U,xs(Re),kt,Ue)}if(V.isShaderMaterial&&V.uniformsNeedUpdate===!0&&(io.upload(U,xs(Re),kt,Ue),V.uniformsNeedUpdate=!1),V.isSpriteMaterial&&lt.setValue(U,"center",H.center),lt.setValue(U,"modelViewMatrix",H.modelViewMatrix),lt.setValue(U,"normalMatrix",H.normalMatrix),lt.setValue(U,"modelMatrix",H.matrixWorld),V.uniformsGroups!==void 0){const yt=V.uniformsGroups;for(let Ot=0,Gn=yt.length;Ot<Gn;Ot++){const Zl=yt[Ot];be.update(Zl,Ht),be.bind(Zl,Ht)}}return Ht}function zn(T,I){T.ambientLightColor.needsUpdate=I,T.lightProbe.needsUpdate=I,T.sunLights.needsUpdate=I,T.sunLightShadows.needsUpdate=I,T.directionalLights.needsUpdate=I,T.directionalLightShadows.needsUpdate=I,T.pointLights.needsUpdate=I,T.pointLightShadows.needsUpdate=I,T.spotLights.needsUpdate=I,T.spotLightShadows.needsUpdate=I,T.rectAreaLights.needsUpdate=I,T.hemisphereLights.needsUpdate=I}function Si(T){return T.isMeshLambertMaterial||T.isMeshToonMaterial||T.isMeshPhongMaterial||T.isMeshStandardMaterial||T.isShadowMaterial||T.isShaderMaterial&&T.lights===!0}this.getActiveCubeFace=function(){return z},this.getActiveMipmapLevel=function(){return B},this.getRenderTarget=function(){return ee},this.setRenderTargetTextures=function(T,I,X){const V=fe.get(T);V.__autoAllocateDepthBuffer=T.resolveDepthBuffer===!1,V.__autoAllocateDepthBuffer===!1&&(V.__useRenderToTexture=!1),fe.get(T.texture).__webglTexture=I,fe.get(T.depthTexture).__webglTexture=V.__autoAllocateDepthBuffer?void 0:X,V.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(T,I){const X=fe.get(T);X.__webglFramebuffer=I,X.__useDefaultFramebuffer=I===void 0},this.setRenderTarget=function(T,I=0,X=0){ee=T,z=I,B=X;let V=null,H=!1,ge=!1;if(T){const pe=fe.get(T);if(pe.__useDefaultFramebuffer!==void 0){ve.bindFramebuffer(U.FRAMEBUFFER,pe.__webglFramebuffer),te.copy(T.viewport),ye.copy(T.scissor),ke=T.scissorTest,ve.viewport(te),ve.scissor(ye),ve.setScissorTest(ke),Y=-1;return}else if(pe.__webglFramebuffer===void 0)Ue.setupRenderTarget(T);else if(pe.__hasExternalTextures)Ue.rebindTextures(T,fe.get(T.texture).__webglTexture,fe.get(T.depthTexture).__webglTexture);else if(T.depthBuffer){const qe=T.depthTexture;if(pe.__boundDepthTexture!==qe){if(qe!==null&&fe.has(qe)&&(T.width!==qe.image.width||T.height!==qe.image.height))throw new Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");Ue.setupDepthRenderbuffer(T)}}const Se=T.texture;(Se.isData3DTexture||Se.isDataArrayTexture||Se.isCompressedArrayTexture)&&(ge=!0);const Le=fe.get(T).__webglFramebuffer;T.isWebGLCubeRenderTarget?(Array.isArray(Le[I])?V=Le[I][X]:V=Le[I],H=!0):T.samples>0&&Ue.useMultisampledRTT(T)===!1?V=fe.get(T).__webglMultisampledFramebuffer:Array.isArray(Le)?V=Le[X]:V=Le,te.copy(T.viewport),ye.copy(T.scissor),ke=T.scissorTest}else te.copy(Ce).multiplyScalar(_e).floor(),ye.copy(Ke).multiplyScalar(_e).floor(),ke=Ze;if(X!==0&&(V=W),ve.bindFramebuffer(U.FRAMEBUFFER,V)&&ve.drawBuffers(T,V),ve.viewport(te),ve.scissor(ye),ve.setScissorTest(ke),H){const pe=fe.get(T.texture);U.framebufferTexture2D(U.FRAMEBUFFER,U.COLOR_ATTACHMENT0,U.TEXTURE_CUBE_MAP_POSITIVE_X+I,pe.__webglTexture,X)}else if(ge){const pe=I;for(let Se=0;Se<T.textures.length;Se++){const Le=fe.get(T.textures[Se]);U.framebufferTextureLayer(U.FRAMEBUFFER,U.COLOR_ATTACHMENT0+Se,Le.__webglTexture,X,pe)}}else if(T!==null&&X!==0){const pe=fe.get(T.texture);U.framebufferTexture2D(U.FRAMEBUFFER,U.COLOR_ATTACHMENT0,U.TEXTURE_2D,pe.__webglTexture,X)}Y=-1};function An(T){const I=fe.get(T);return(I.__readFormat!==T.format||I.__readType!==T.type)&&(I.__readFormat=T.format,I.__readType=T.type,I.__formatReadable=mt.textureFormatReadable(T.format),I.__typeReadable=mt.textureTypeReadable(T.type)),I}this.readRenderTargetPixels=function(T,I,X,V,H,ge,Ee,pe=0){if(!(T&&T.isWebGLRenderTarget)){Xe("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Se=fe.get(T).__webglFramebuffer;if(T.isWebGLCubeRenderTarget&&Ee!==void 0&&(Se=Se[Ee],Array.isArray(Se)&&(Se=Se[0])),Se){ve.bindFramebuffer(U.FRAMEBUFFER,Se);try{const Le=T.textures[pe],qe=Le.format,it=Le.type;T.textures.length>1&&U.readBuffer(U.COLOR_ATTACHMENT0+pe);const we=An(Le);if(we.__formatReadable===!1){Xe("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(we.__typeReadable===!1){Xe("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}I>=0&&I<=T.width-V&&X>=0&&X<=T.height-H&&U.readPixels(I,X,V,H,ae.convert(qe),ae.convert(it),ge)}finally{const Le=ee!==null?fe.get(ee).__webglFramebuffer:null;ve.bindFramebuffer(U.FRAMEBUFFER,Le)}}},this.readRenderTargetPixelsAsync=async function(T,I,X,V,H,ge,Ee,pe=0){if(!(T&&T.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Se=fe.get(T).__webglFramebuffer;if(T.isWebGLCubeRenderTarget&&Ee!==void 0&&(Se=Se[Ee],Array.isArray(Se)&&(Se=Se[0])),Se)if(I>=0&&I<=T.width-V&&X>=0&&X<=T.height-H){ve.bindFramebuffer(U.FRAMEBUFFER,Se);const Le=T.textures[pe],qe=Le.format,it=Le.type;T.textures.length>1&&U.readBuffer(U.COLOR_ATTACHMENT0+pe);const we=An(Le);if(we.__formatReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(we.__typeReadable===!1)throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const rt=U.createBuffer();U.bindBuffer(U.PIXEL_PACK_BUFFER,rt),U.bufferData(U.PIXEL_PACK_BUFFER,ge.byteLength,U.STREAM_READ),U.readPixels(I,X,V,H,ae.convert(qe),ae.convert(it),0),U.bindBuffer(U.PIXEL_PACK_BUFFER,null);const Rt=ee!==null?fe.get(ee).__webglFramebuffer:null;ve.bindFramebuffer(U.FRAMEBUFFER,Rt);const St=U.fenceSync(U.SYNC_GPU_COMMANDS_COMPLETE,0);return U.flush(),await Tf(U,St,4),U.bindBuffer(U.PIXEL_PACK_BUFFER,rt),U.getBufferSubData(U.PIXEL_PACK_BUFFER,0,ge),U.bindBuffer(U.PIXEL_PACK_BUFFER,null),U.deleteBuffer(rt),U.deleteSync(St),ge}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(T,I=null,X=0){const V=Math.pow(2,-X),H=Math.floor(T.image.width*V),ge=Math.floor(T.image.height*V),Ee=I!==null?I.x:0,pe=I!==null?I.y:0;Ue.setTexture2D(T,0),U.copyTexSubImage2D(U.TEXTURE_2D,X,0,0,Ee,pe,H,ge),ve.unbindTexture()},this.copyTextureToTexture=function(T,I,X=null,V=null,H=0,ge=0){let Ee,pe,Se,Le,qe,it,we,rt,Rt;const St=T.isCompressedTexture?T.mipmaps[ge]:T.image;if(X!==null)Ee=X.max.x-X.min.x,pe=X.max.y-X.min.y,Se=X.isBox3?X.max.z-X.min.z:1,Le=X.min.x,qe=X.min.y,it=X.isBox3?X.min.z:0;else{const lt=Math.pow(2,-H);Ee=Math.floor(St.width*lt),pe=Math.floor(St.height*lt),T.isDataArrayTexture?Se=St.depth:T.isData3DTexture?Se=Math.floor(St.depth*lt):Se=1,Le=0,qe=0,it=0}V!==null?(we=V.x,rt=V.y,Rt=V.z):(we=0,rt=0,Rt=0);const Mt=ae.convert(I.format),Vt=ae.convert(I.type);let Re;I.isData3DTexture?(Ue.setTexture3D(I,0),Re=U.TEXTURE_3D):I.isDataArrayTexture||I.isCompressedArrayTexture?(Ue.setTexture2DArray(I,0),Re=U.TEXTURE_2D_ARRAY):(Ue.setTexture2D(I,0),Re=U.TEXTURE_2D),ve.activeTexture(U.TEXTURE0),ve.pixelStorei(U.UNPACK_FLIP_Y_WEBGL,I.flipY),ve.pixelStorei(U.UNPACK_PREMULTIPLY_ALPHA_WEBGL,I.premultiplyAlpha),ve.pixelStorei(U.UNPACK_ALIGNMENT,I.unpackAlignment);const Wt=ve.getParameter(U.UNPACK_ROW_LENGTH),ht=ve.getParameter(U.UNPACK_IMAGE_HEIGHT),yi=ve.getParameter(U.UNPACK_SKIP_PIXELS),Ht=ve.getParameter(U.UNPACK_SKIP_ROWS),Ms=ve.getParameter(U.UNPACK_SKIP_IMAGES);ve.pixelStorei(U.UNPACK_ROW_LENGTH,St.width),ve.pixelStorei(U.UNPACK_IMAGE_HEIGHT,St.height),ve.pixelStorei(U.UNPACK_SKIP_PIXELS,Le),ve.pixelStorei(U.UNPACK_SKIP_ROWS,qe),ve.pixelStorei(U.UNPACK_SKIP_IMAGES,it);const ri=T.isDataArrayTexture||T.isData3DTexture,Ti=I.isDataArrayTexture||I.isData3DTexture;if(T.isDepthTexture){const lt=fe.get(T),kt=fe.get(I),fn=fe.get(lt.__renderTarget),yt=fe.get(kt.__renderTarget);ve.bindFramebuffer(U.READ_FRAMEBUFFER,fn.__webglFramebuffer),ve.bindFramebuffer(U.DRAW_FRAMEBUFFER,yt.__webglFramebuffer);for(let Ot=0;Ot<Se;Ot++)ri&&(U.framebufferTextureLayer(U.READ_FRAMEBUFFER,U.COLOR_ATTACHMENT0,fe.get(T).__webglTexture,H,it+Ot),U.framebufferTextureLayer(U.DRAW_FRAMEBUFFER,U.COLOR_ATTACHMENT0,fe.get(I).__webglTexture,ge,Rt+Ot)),U.blitFramebuffer(Le,qe,Le+Ee,qe+pe,we,rt,we+Ee,rt+pe,U.DEPTH_BUFFER_BIT,U.NEAREST);ve.bindFramebuffer(U.READ_FRAMEBUFFER,null),ve.bindFramebuffer(U.DRAW_FRAMEBUFFER,null)}else if(H!==0||T.isRenderTargetTexture||fe.has(T)){const lt=fe.get(T),kt=fe.get(I);ve.bindFramebuffer(U.READ_FRAMEBUFFER,L),ve.bindFramebuffer(U.DRAW_FRAMEBUFFER,G);for(let fn=0;fn<Se;fn++)ri?U.framebufferTextureLayer(U.READ_FRAMEBUFFER,U.COLOR_ATTACHMENT0,lt.__webglTexture,H,it+fn):U.framebufferTexture2D(U.READ_FRAMEBUFFER,U.COLOR_ATTACHMENT0,U.TEXTURE_2D,lt.__webglTexture,H),Ti?U.framebufferTextureLayer(U.DRAW_FRAMEBUFFER,U.COLOR_ATTACHMENT0,kt.__webglTexture,ge,Rt+fn):U.framebufferTexture2D(U.DRAW_FRAMEBUFFER,U.COLOR_ATTACHMENT0,U.TEXTURE_2D,kt.__webglTexture,ge),H!==0?U.blitFramebuffer(Le,qe,Le+Ee,qe+pe,we,rt,we+Ee,rt+pe,U.COLOR_BUFFER_BIT,U.NEAREST):Ti?U.copyTexSubImage3D(Re,ge,we,rt,Rt+fn,Le,qe,Ee,pe):U.copyTexSubImage2D(Re,ge,we,rt,Le,qe,Ee,pe);ve.bindFramebuffer(U.READ_FRAMEBUFFER,null),ve.bindFramebuffer(U.DRAW_FRAMEBUFFER,null)}else Ti?T.isDataTexture||T.isData3DTexture?U.texSubImage3D(Re,ge,we,rt,Rt,Ee,pe,Se,Mt,Vt,St.data):I.isCompressedArrayTexture?U.compressedTexSubImage3D(Re,ge,we,rt,Rt,Ee,pe,Se,Mt,St.data):U.texSubImage3D(Re,ge,we,rt,Rt,Ee,pe,Se,Mt,Vt,St):T.isDataTexture?U.texSubImage2D(U.TEXTURE_2D,ge,we,rt,Ee,pe,Mt,Vt,St.data):T.isCompressedTexture?U.compressedTexSubImage2D(U.TEXTURE_2D,ge,we,rt,St.width,St.height,Mt,St.data):U.texSubImage2D(U.TEXTURE_2D,ge,we,rt,Ee,pe,Mt,Vt,St);ve.pixelStorei(U.UNPACK_ROW_LENGTH,Wt),ve.pixelStorei(U.UNPACK_IMAGE_HEIGHT,ht),ve.pixelStorei(U.UNPACK_SKIP_PIXELS,yi),ve.pixelStorei(U.UNPACK_SKIP_ROWS,Ht),ve.pixelStorei(U.UNPACK_SKIP_IMAGES,Ms),ge===0&&I.generateMipmaps===!0&&I.mipmapsAutoUpdate===!0&&U.generateMipmap(Re),ve.unbindTexture()},this.initRenderTarget=function(T){fe.get(T).__webglFramebuffer===void 0&&Ue.setupRenderTarget(T)},this.initTexture=function(T){T.isCubeTexture?Ue.setTextureCube(T,0):T.isData3DTexture?Ue.setTexture3D(T,0):T.isDataArrayTexture||T.isCompressedArrayTexture?Ue.setTexture2DArray(T,0):Ue.setTexture2D(T,0),ve.unbindTexture()},this.resetState=function(){z=0,B=0,ee=null,ve.reset(),ce.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return Mn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorSpace=tt._getDrawingBufferColorSpace(e),t.unpackColorSpace=tt._getUnpackColorSpace()}}function _u(i,e){if(e===uf)return console.warn("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Geometry already defined as triangles."),i;if(e===al||e===Ph){let t=i.getIndex();if(t===null){const s=[],o=i.getAttribute("position");if(o!==void 0){for(let a=0;a<o.count;a++)s.push(a);i.setIndex(s),t=i.getIndex()}else return console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Undefined position attribute. Processing not possible."),i}const n=t.count-2,r=[];if(e===al)for(let s=1;s<=n;s++)r.push(t.getX(0)),r.push(t.getX(s)),r.push(t.getX(s+1));else for(let s=0;s<n;s++)s%2===0?(r.push(t.getX(s)),r.push(t.getX(s+1)),r.push(t.getX(s+2))):(r.push(t.getX(s+2)),r.push(t.getX(s+1)),r.push(t.getX(s)));return r.length/3!==n&&console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unable to generate correct amount of triangles."),i.setIndex(r),i.clearGroups(),i}else return console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unknown draw mode:",e),i}function $v(i){const e=new Map,t=new Map,n=i.clone();return dd(i,n,function(r,s){e.set(s,r),t.set(r,s)}),n.traverse(function(r){if(!r.isSkinnedMesh)return;const s=r,o=e.get(r),a=o.skeleton.bones;s.skeleton=o.skeleton.clone(),s.bindMatrix.copy(o.bindMatrix),s.skeleton.bones=a.map(function(l){return t.get(l)}),s.bind(s.skeleton,s.bindMatrix)}),n}function dd(i,e,t){t(i,e);for(let n=0;n<i.children.length;n++)dd(i.children[n],e.children[n],t)}class Zv extends Ar{constructor(e){super(e),this.dracoLoader=null,this.ktx2Loader=null,this.meshoptDecoder=null,this.pluginCallbacks=[],this.register(function(t){return new tx(t)}),this.register(function(t){return new nx(t)}),this.register(function(t){return new ix(t)}),this.register(function(t){return new dx(t)}),this.register(function(t){return new fx(t)}),this.register(function(t){return new px(t)}),this.register(function(t){return new sx(t)}),this.register(function(t){return new ox(t)}),this.register(function(t){return new ax(t)}),this.register(function(t){return new lx(t)}),this.register(function(t){return new ex(t)}),this.register(function(t){return new cx(t)}),this.register(function(t){return new rx(t)}),this.register(function(t){return new hx(t)}),this.register(function(t){return new ux(t)}),this.register(function(t){return new Qv(t)}),this.register(function(t){return new vu(t,je.EXT_MESHOPT_COMPRESSION)}),this.register(function(t){return new vu(t,je.KHR_MESHOPT_COMPRESSION)}),this.register(function(t){return new mx(t)})}load(e,t,n,r){const s=this;let o;if(this.resourcePath!=="")o=this.resourcePath;else if(this.path!==""){const c=is.extractUrlBase(e);o=is.resolveURL(c,this.path)}else o=is.extractUrlBase(e);this.manager.itemStart(e);const a=function(c){r?r(c):console.error(c),s.manager.itemError(e),s.manager.itemEnd(e)},l=new Qh(this.manager);l.setPriority(this.priority),l.setCache(this.cache),l.setPath(this.path),l.setResponseType("arraybuffer"),l.setRequestHeader(this.requestHeader),l.setWithCredentials(this.withCredentials),l.load(e,function(c){try{s.parse(c,o,function(u){t(u),s.manager.itemEnd(e)},a)}catch(u){a(u)}},n,a)}setDRACOLoader(e){return this.dracoLoader=e,this}setKTX2Loader(e){return this.ktx2Loader=e,this}setMeshoptDecoder(e){return this.meshoptDecoder=e,this}register(e){return this.pluginCallbacks.indexOf(e)===-1&&this.pluginCallbacks.push(e),this}unregister(e){return this.pluginCallbacks.indexOf(e)!==-1&&this.pluginCallbacks.splice(this.pluginCallbacks.indexOf(e),1),this}parse(e,t,n,r){let s;const o={},a={},l=new TextDecoder;if(typeof e=="string")s=JSON.parse(e);else if(e instanceof ArrayBuffer)if(l.decode(new Uint8Array(e,0,4))===fd){try{o[je.KHR_BINARY_GLTF]=new gx(e)}catch(h){r&&r(h);return}s=JSON.parse(o[je.KHR_BINARY_GLTF].content)}else s=JSON.parse(l.decode(e));else s=e;if(s.asset===void 0||s.asset.version[0]<2){r&&r(new Error("THREE.GLTFLoader: Unsupported asset. glTF versions >=2.0 are supported."));return}const c=new Cx(s,{path:t||this.resourcePath||"",crossOrigin:this.crossOrigin,priority:this.priority,cache:this.cache,withCredentials:this.withCredentials,requestHeader:this.requestHeader,manager:this.manager,ktx2Loader:this.ktx2Loader,meshoptDecoder:this.meshoptDecoder});c.fileLoader.setRequestHeader(this.requestHeader);for(let u=0;u<this.pluginCallbacks.length;u++){const h=this.pluginCallbacks[u](c);h.name||console.error("THREE.GLTFLoader: Invalid plugin found: missing name"),a[h.name]=h,o[h.name]=!0}if(s.extensionsUsed)for(let u=0;u<s.extensionsUsed.length;++u){const h=s.extensionsUsed[u],d=s.extensionsRequired||[];switch(h){case je.KHR_MATERIALS_UNLIT:o[h]=new jv;break;case je.KHR_DRACO_MESH_COMPRESSION:o[h]=new _x(s,this.dracoLoader);break;case je.KHR_TEXTURE_TRANSFORM:o[h]=new vx;break;case je.KHR_MESH_QUANTIZATION:o[h]=new xx;break;default:d.indexOf(h)>=0&&a[h]===void 0&&console.warn('THREE.GLTFLoader: Unknown extension "'+h+'".')}}c.setExtensions(o),c.setPlugins(a),c.parse(n,r)}parseAsync(e,t){const n=this;return new Promise(function(r,s){n.parse(e,t,r,s)})}}function Jv(){let i={};return{get:function(e){return i[e]},add:function(e,t){i[e]=t},remove:function(e){delete i[e]},removeAll:function(){i={}}}}function Tt(i,e,t){const n=i.json.materials[e];return n.extensions&&n.extensions[t]?n.extensions[t]:null}const je={KHR_BINARY_GLTF:"KHR_binary_glTF",KHR_DRACO_MESH_COMPRESSION:"KHR_draco_mesh_compression",KHR_LIGHTS_PUNCTUAL:"KHR_lights_punctual",KHR_MATERIALS_CLEARCOAT:"KHR_materials_clearcoat",KHR_MATERIALS_DIFFUSE_ROUGHNESS:"KHR_materials_diffuse_roughness",KHR_MATERIALS_DISPERSION:"KHR_materials_dispersion",KHR_MATERIALS_IOR:"KHR_materials_ior",KHR_MATERIALS_SHEEN:"KHR_materials_sheen",KHR_MATERIALS_SPECULAR:"KHR_materials_specular",KHR_MATERIALS_TRANSMISSION:"KHR_materials_transmission",KHR_MATERIALS_IRIDESCENCE:"KHR_materials_iridescence",KHR_MATERIALS_ANISOTROPY:"KHR_materials_anisotropy",KHR_MATERIALS_UNLIT:"KHR_materials_unlit",KHR_MATERIALS_VOLUME:"KHR_materials_volume",KHR_TEXTURE_BASISU:"KHR_texture_basisu",KHR_TEXTURE_TRANSFORM:"KHR_texture_transform",KHR_MESH_QUANTIZATION:"KHR_mesh_quantization",KHR_MATERIALS_EMISSIVE_STRENGTH:"KHR_materials_emissive_strength",EXT_MATERIALS_BUMP:"EXT_materials_bump",EXT_TEXTURE_WEBP:"EXT_texture_webp",EXT_TEXTURE_AVIF:"EXT_texture_avif",EXT_MESHOPT_COMPRESSION:"EXT_meshopt_compression",KHR_MESHOPT_COMPRESSION:"KHR_meshopt_compression",EXT_MESH_GPU_INSTANCING:"EXT_mesh_gpu_instancing"};class Qv{constructor(e){this.parser=e,this.name=je.KHR_LIGHTS_PUNCTUAL,this.cache={refs:{},uses:{}}}_markDefs(){const e=this.parser,t=this.parser.json.nodes||[];for(let n=0,r=t.length;n<r;n++){const s=t[n];s.extensions&&s.extensions[this.name]&&s.extensions[this.name].light!==void 0&&e._addNodeRef(this.cache,s.extensions[this.name].light)}}_loadLight(e){const t=this.parser,n="light:"+e;let r=t.cache.get(n);if(r)return r;const s=t.json,l=((s.extensions&&s.extensions[this.name]||{}).lights||[])[e];let c;const u=new Ne(16777215);l.color!==void 0&&u.setRGB(l.color[0],l.color[1],l.color[2],tn);const h=l.range!==void 0?l.range:0;switch(l.type){case"directional":c=new cl(u),c.target.position.set(0,0,-1),c.add(c.target);break;case"point":c=new V0(u),c.distance=h;break;case"spot":c=new B0(u),c.distance=h,l.spot=l.spot||{},l.spot.innerConeAngle=l.spot.innerConeAngle!==void 0?l.spot.innerConeAngle:0,l.spot.outerConeAngle=l.spot.outerConeAngle!==void 0?l.spot.outerConeAngle:Math.PI/4,c.angle=l.spot.outerConeAngle,c.penumbra=1-l.spot.innerConeAngle/l.spot.outerConeAngle,c.target.position.set(0,0,-1),c.add(c.target);break;default:throw new Error("THREE.GLTFLoader: Unexpected light type: "+l.type)}return c.position.set(0,0,0),In(c,l),l.intensity!==void 0&&(c.intensity=l.intensity),c.name=t.createUniqueName(l.name||"light_"+e),r=Promise.resolve(c),t.cache.add(n,r),r}getDependency(e,t){if(e==="light")return this._loadLight(t)}createNodeAttachment(e){const t=this,n=this.parser,s=n.json.nodes[e],a=(s.extensions&&s.extensions[this.name]||{}).light;return a===void 0?null:this._loadLight(a).then(function(l){return n._getNodeRef(t.cache,a,l)})}}class jv{constructor(){this.name=je.KHR_MATERIALS_UNLIT}getMaterialType(){return Un}extendParams(e,t,n){const r=[];e.color=new Ne(1,1,1),e.opacity=1;const s=t.pbrMetallicRoughness;if(s){if(Array.isArray(s.baseColorFactor)){const o=s.baseColorFactor;e.color.setRGB(o[0],o[1],o[2],tn),e.opacity=o[3]}s.baseColorTexture!==void 0&&r.push(n.assignTexture(e,"map",s.baseColorTexture,Pt))}return Promise.all(r)}}class ex{constructor(e){this.parser=e,this.name=je.KHR_MATERIALS_EMISSIVE_STRENGTH}extendMaterialParams(e,t){const n=Tt(this.parser,e,this.name);return n===null||n.emissiveStrength!==void 0&&(t.emissiveIntensity=n.emissiveStrength),Promise.resolve()}}class tx{constructor(e){this.parser=e,this.name=je.KHR_MATERIALS_CLEARCOAT}getMaterialType(e){return Tt(this.parser,e,this.name)!==null?Tn:null}extendMaterialParams(e,t){const n=Tt(this.parser,e,this.name);if(n===null)return Promise.resolve();const r=[];if(n.clearcoatFactor!==void 0&&(t.clearcoat=n.clearcoatFactor),n.clearcoatTexture!==void 0&&r.push(this.parser.assignTexture(t,"clearcoatMap",n.clearcoatTexture)),n.clearcoatRoughnessFactor!==void 0&&(t.clearcoatRoughness=n.clearcoatRoughnessFactor),n.clearcoatRoughnessTexture!==void 0&&r.push(this.parser.assignTexture(t,"clearcoatRoughnessMap",n.clearcoatRoughnessTexture)),n.clearcoatNormalTexture!==void 0&&(r.push(this.parser.assignTexture(t,"clearcoatNormalMap",n.clearcoatNormalTexture)),n.clearcoatNormalTexture.scale!==void 0)){const s=n.clearcoatNormalTexture.scale;t.clearcoatNormalScale=new Ye(s,s)}return Promise.all(r)}}class nx{constructor(e){this.parser=e,this.name=je.KHR_MATERIALS_DIFFUSE_ROUGHNESS}getMaterialType(e){return Tt(this.parser,e,this.name)!==null?Tn:null}extendMaterialParams(e,t){const n=Tt(this.parser,e,this.name);if(n===null)return Promise.resolve();const r=[];return t.diffuseRoughness=n.diffuseRoughnessFactor!==void 0?n.diffuseRoughnessFactor:0,n.diffuseRoughnessTexture!==void 0&&r.push(this.parser.assignTexture(t,"diffuseRoughnessMap",n.diffuseRoughnessTexture)),Promise.all(r)}}class ix{constructor(e){this.parser=e,this.name=je.KHR_MATERIALS_DISPERSION}getMaterialType(e){return Tt(this.parser,e,this.name)!==null?Tn:null}extendMaterialParams(e,t){const n=Tt(this.parser,e,this.name);return n===null||(t.dispersion=n.dispersion!==void 0?n.dispersion:0),Promise.resolve()}}class rx{constructor(e){this.parser=e,this.name=je.KHR_MATERIALS_IRIDESCENCE}getMaterialType(e){return Tt(this.parser,e,this.name)!==null?Tn:null}extendMaterialParams(e,t){const n=Tt(this.parser,e,this.name);if(n===null)return Promise.resolve();const r=[];return n.iridescenceFactor!==void 0&&(t.iridescence=n.iridescenceFactor),n.iridescenceTexture!==void 0&&r.push(this.parser.assignTexture(t,"iridescenceMap",n.iridescenceTexture)),n.iridescenceIor!==void 0&&(t.iridescenceIOR=n.iridescenceIor),n.iridescenceThicknessMinimum!==void 0&&(t.iridescenceThicknessMinimum=n.iridescenceThicknessMinimum),n.iridescenceThicknessMaximum!==void 0&&(t.iridescenceThicknessMaximum=n.iridescenceThicknessMaximum),n.iridescenceThicknessTexture!==void 0&&r.push(this.parser.assignTexture(t,"iridescenceThicknessMap",n.iridescenceThicknessTexture)),Promise.all(r)}}class sx{constructor(e){this.parser=e,this.name=je.KHR_MATERIALS_SHEEN}getMaterialType(e){return Tt(this.parser,e,this.name)!==null?Tn:null}extendMaterialParams(e,t){const n=Tt(this.parser,e,this.name);if(n===null)return Promise.resolve();const r=[];if(t.sheenColor=new Ne(0,0,0),t.sheenRoughness=0,t.sheen=1,n.sheenColorFactor!==void 0){const s=n.sheenColorFactor;t.sheenColor.setRGB(s[0],s[1],s[2],tn)}return n.sheenRoughnessFactor!==void 0&&(t.sheenRoughness=n.sheenRoughnessFactor),n.sheenColorTexture!==void 0&&r.push(this.parser.assignTexture(t,"sheenColorMap",n.sheenColorTexture,Pt)),n.sheenRoughnessTexture!==void 0&&r.push(this.parser.assignTexture(t,"sheenRoughnessMap",n.sheenRoughnessTexture)),Promise.all(r)}}class ox{constructor(e){this.parser=e,this.name=je.KHR_MATERIALS_TRANSMISSION}getMaterialType(e){return Tt(this.parser,e,this.name)!==null?Tn:null}extendMaterialParams(e,t){const n=Tt(this.parser,e,this.name);if(n===null)return Promise.resolve();const r=[];return n.transmissionFactor!==void 0&&(t.transmission=n.transmissionFactor),n.transmissionTexture!==void 0&&r.push(this.parser.assignTexture(t,"transmissionMap",n.transmissionTexture)),Promise.all(r)}}class ax{constructor(e){this.parser=e,this.name=je.KHR_MATERIALS_VOLUME}getMaterialType(e){return Tt(this.parser,e,this.name)!==null?Tn:null}extendMaterialParams(e,t){const n=Tt(this.parser,e,this.name);if(n===null)return Promise.resolve();const r=[];t.thickness=n.thicknessFactor!==void 0?n.thicknessFactor:0,n.thicknessTexture!==void 0&&r.push(this.parser.assignTexture(t,"thicknessMap",n.thicknessTexture)),t.attenuationDistance=n.attenuationDistance||1/0;const s=n.attenuationColor||[1,1,1];return t.attenuationColor=new Ne().setRGB(s[0],s[1],s[2],tn),Promise.all(r)}}class lx{constructor(e){this.parser=e,this.name=je.KHR_MATERIALS_IOR}getMaterialType(e){return Tt(this.parser,e,this.name)!==null?Tn:null}extendMaterialParams(e,t){const n=Tt(this.parser,e,this.name);return n===null||(t.ior=n.ior!==void 0?n.ior:1.5,t.ior===0&&(t.ior=1e3)),Promise.resolve()}}class cx{constructor(e){this.parser=e,this.name=je.KHR_MATERIALS_SPECULAR}getMaterialType(e){return Tt(this.parser,e,this.name)!==null?Tn:null}extendMaterialParams(e,t){const n=Tt(this.parser,e,this.name);if(n===null)return Promise.resolve();const r=[];t.specularIntensity=n.specularFactor!==void 0?n.specularFactor:1,n.specularTexture!==void 0&&r.push(this.parser.assignTexture(t,"specularIntensityMap",n.specularTexture));const s=n.specularColorFactor||[1,1,1];return t.specularColor=new Ne().setRGB(s[0],s[1],s[2],tn),n.specularColorTexture!==void 0&&r.push(this.parser.assignTexture(t,"specularColorMap",n.specularColorTexture,Pt)),Promise.all(r)}}class ux{constructor(e){this.parser=e,this.name=je.EXT_MATERIALS_BUMP}getMaterialType(e){return Tt(this.parser,e,this.name)!==null?Tn:null}extendMaterialParams(e,t){const n=Tt(this.parser,e,this.name);if(n===null)return Promise.resolve();const r=[];return t.bumpScale=n.bumpFactor!==void 0?n.bumpFactor:1,n.bumpTexture!==void 0&&r.push(this.parser.assignTexture(t,"bumpMap",n.bumpTexture)),Promise.all(r)}}class hx{constructor(e){this.parser=e,this.name=je.KHR_MATERIALS_ANISOTROPY}getMaterialType(e){return Tt(this.parser,e,this.name)!==null?Tn:null}extendMaterialParams(e,t){const n=Tt(this.parser,e,this.name);if(n===null)return Promise.resolve();const r=[];return n.anisotropyStrength!==void 0&&(t.anisotropy=n.anisotropyStrength),n.anisotropyRotation!==void 0&&(t.anisotropyRotation=n.anisotropyRotation),n.anisotropyTexture!==void 0&&r.push(this.parser.assignTexture(t,"anisotropyMap",n.anisotropyTexture)),Promise.all(r)}}class dx{constructor(e){this.parser=e,this.name=je.KHR_TEXTURE_BASISU}loadTexture(e){const t=this.parser,n=t.json,r=n.textures[e];if(!r.extensions||!r.extensions[this.name])return null;const s=r.extensions[this.name],o=t.options.ktx2Loader;if(!o){if(n.extensionsRequired&&n.extensionsRequired.indexOf(this.name)>=0)throw new Error("THREE.GLTFLoader: setKTX2Loader must be called before loading KTX2 textures");return null}return t.loadTextureImage(e,s.source,o)}}class fx{constructor(e){this.parser=e,this.name=je.EXT_TEXTURE_WEBP}loadTexture(e){const t=this.name,n=this.parser,r=n.json,s=r.textures[e];if(!s.extensions||!s.extensions[t])return null;const o=s.extensions[t],a=r.images[o.source];let l=n.textureLoader;if(a.uri){const c=n.options.manager.getHandler(a.uri);c!==null&&(l=c)}return n.loadTextureImage(e,o.source,l)}}class px{constructor(e){this.parser=e,this.name=je.EXT_TEXTURE_AVIF}loadTexture(e){const t=this.name,n=this.parser,r=n.json,s=r.textures[e];if(!s.extensions||!s.extensions[t])return null;const o=s.extensions[t],a=r.images[o.source];let l=n.textureLoader;if(a.uri){const c=n.options.manager.getHandler(a.uri);c!==null&&(l=c)}return n.loadTextureImage(e,o.source,l)}}class vu{constructor(e,t){this.name=t,this.parser=e}loadBufferView(e){const t=this.parser.json,n=t.bufferViews[e];if(n.extensions&&n.extensions[this.name]){const r=n.extensions[this.name],s=this.parser.getDependency("buffer",r.buffer),o=this.parser.options.meshoptDecoder;if(!o||!o.supported){if(t.extensionsRequired&&t.extensionsRequired.indexOf(this.name)>=0)throw new Error("THREE.GLTFLoader: setMeshoptDecoder must be called before loading compressed files");return null}return s.then(function(a){const l=r.byteOffset||0,c=r.byteLength||0,u=r.count,h=r.byteStride,d=new Uint8Array(a,l,c);return o.decodeGltfBufferAsync?o.decodeGltfBufferAsync(u,h,d,r.mode,r.filter).then(function(f){return f.buffer}):o.ready.then(function(){const f=new ArrayBuffer(u*h);return o.decodeGltfBuffer(new Uint8Array(f),u,h,d,r.mode,r.filter),f})})}else return null}}class mx{constructor(e){this.name=je.EXT_MESH_GPU_INSTANCING,this.parser=e}createNodeMesh(e){const t=this.parser.json,n=t.nodes[e];if(!n.extensions||!n.extensions[this.name]||n.mesh===void 0)return null;const r=t.meshes[n.mesh];for(const c of r.primitives)if(c.mode!==an.TRIANGLES&&c.mode!==an.TRIANGLE_STRIP&&c.mode!==an.TRIANGLE_FAN&&c.mode!==void 0)return null;const o=n.extensions[this.name].attributes,a=[],l={};for(const c in o)a.push(this.parser.getDependency("accessor",o[c]).then(u=>(l[c]=u,l[c])));return a.length<1?null:(a.push(this.parser.createNodeMesh(e)),Promise.all(a).then(c=>{const u=c.pop(),h=u.isGroup?u.children:[u],d=c[0].count,f=[];for(const g of h){const v=new Ve,p=new C,m=new Fe,x=new C(1,1,1),A=new u0(g.geometry,g.material,d);for(let b=0;b<d;b++)l.TRANSLATION&&p.fromBufferAttribute(l.TRANSLATION,b),l.ROTATION&&m.fromBufferAttribute(l.ROTATION,b),l.SCALE&&x.fromBufferAttribute(l.SCALE,b),A.setMatrixAt(b,v.compose(p,m,x));let y=null;for(const b in l)if(b==="_COLOR_0"){const E=l[b];A.instanceColor=new po(E.array,E.itemSize,E.normalized)}else if(b!=="TRANSLATION"&&b!=="ROTATION"&&b!=="SCALE"){if(y===null){const _=A.geometry;y=new Et,y.name=_.name;for(const S in _.attributes)y.setAttribute(S,_.attributes[S]);for(const S in _.morphAttributes)y.morphAttributes[S]=_.morphAttributes[S];_.index!==null&&y.setIndex(_.index),y.morphTargetsRelative=_.morphTargetsRelative;for(const S of _.groups)y.addGroup(S.start,S.count,S.materialIndex);_.boundingBox!==null&&(y.boundingBox=_.boundingBox.clone()),_.boundingSphere!==null&&(y.boundingSphere=_.boundingSphere.clone()),y.drawRange.start=_.drawRange.start,y.drawRange.count=_.drawRange.count,y.userData=Object.assign({},_.userData),A.geometry=y}const E=l[b];y.setAttribute(b,new po(E.array,E.itemSize,E.normalized))}ft.prototype.copy.call(A,g),this.parser.assignFinalMaterial(A),f.push(A)}return u.isGroup?(u.clear(),u.add(...f),u):f[0]}))}}const fd="glTF",Vr=12,xu={JSON:1313821514,BIN:5130562};class gx{constructor(e){this.name=je.KHR_BINARY_GLTF,this.content=null,this.body=null;const t=new DataView(e,0,Vr),n=new TextDecoder;if(this.header={magic:n.decode(new Uint8Array(e.slice(0,4))),version:t.getUint32(4,!0),length:t.getUint32(8,!0)},this.header.magic!==fd)throw new Error("THREE.GLTFLoader: Unsupported glTF-Binary header.");if(this.header.version<2)throw new Error("THREE.GLTFLoader: Legacy binary file detected.");const r=this.header.length-Vr,s=new DataView(e,Vr);let o=0;for(;o<r;){const a=s.getUint32(o,!0);o+=4;const l=s.getUint32(o,!0);if(o+=4,l===xu.JSON){const c=new Uint8Array(e,Vr+o,a);this.content=n.decode(c)}else if(l===xu.BIN){const c=Vr+o;this.body=e.slice(c,c+a)}o+=a}if(this.content===null)throw new Error("THREE.GLTFLoader: JSON content not found.")}}class _x{constructor(e,t){if(!t)throw new Error("THREE.GLTFLoader: No DRACOLoader instance provided.");this.name=je.KHR_DRACO_MESH_COMPRESSION,this.json=e,this.dracoLoader=t,this.dracoLoader.preload()}decodePrimitive(e,t){const n=this.json,r=this.dracoLoader,s=e.extensions[this.name].bufferView,o=e.extensions[this.name].attributes,a={},l={},c={};for(const u in o){const h=dl[u]||u.toLowerCase();a[h]=o[u]}for(const u in e.attributes){const h=dl[u]||u.toLowerCase();if(o[u]!==void 0){const d=n.accessors[e.attributes[u]],f=pr[d.componentType];c[h]=f.name,l[h]=d.normalized===!0}}return t.getDependency("bufferView",s).then(function(u){return new Promise(function(h,d){r.decodeDracoFile(u,function(f){for(const g in f.attributes){const v=f.attributes[g],p=l[g];p!==void 0&&(v.normalized=p)}h(f)},a,c,tn,d)})})}}class vx{constructor(){this.name=je.KHR_TEXTURE_TRANSFORM}extendTexture(e,t){if((t.texCoord===void 0||t.texCoord===e.channel)&&t.offset===void 0&&t.rotation===void 0&&t.scale===void 0)return e;if(e=e.clone(),t.texCoord!==void 0&&(e.channel=t.texCoord),t.offset!==void 0&&e.offset.fromArray(t.offset),t.rotation!==void 0&&(e.rotation=t.rotation),t.scale!==void 0&&e.repeat.fromArray(t.scale),t.rotation!==void 0){const n=Math.cos(e.rotation),r=Math.sin(e.rotation);e.matrix.set(e.repeat.x*n,e.repeat.y*r,e.offset.x,-e.repeat.x*r,e.repeat.y*n,e.offset.y,0,0,1),e.matrixAutoUpdate=!1}return e.needsUpdate=!0,e}}class xx{constructor(){this.name=je.KHR_MESH_QUANTIZATION}}class pd extends Tr{constructor(e,t,n,r){super(e,t,n,r)}copySampleValue_(e){const t=this.resultBuffer,n=this.sampleValues,r=this.valueSize,s=e*r*3+r;for(let o=0;o!==r;o++)t[o]=n[s+o];return t}interpolate_(e,t,n,r){const s=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=a*2,c=a*3,u=r-t,h=(n-t)/u,d=h*h,f=d*h,g=e*c,v=g-c,p=-2*f+3*d,m=f-d,x=1-p,A=m-d+h;for(let y=0;y!==a;y++){const b=o[v+y+a],E=o[v+y+l]*u,_=o[g+y+a],S=o[g+y]*u;s[y]=x*b+A*E+p*_+m*S}return s}}const Mx=new Fe;class Sx extends pd{interpolate_(e,t,n,r){const s=super.interpolate_(e,t,n,r);return Mx.fromArray(s).normalize().toArray(s),s}}const an={POINTS:0,LINES:1,LINE_LOOP:2,LINE_STRIP:3,TRIANGLES:4,TRIANGLE_STRIP:5,TRIANGLE_FAN:6},pr={5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array},Mu={9728:It,9729:Bt,9984:Th,9985:Qs,9986:Kr,9987:vn},Su={33071:Dn,33648:ao,10497:_i},aa={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16},dl={POSITION:"position",NORMAL:"normal",TANGENT:"tangent",TEXCOORD_0:"uv",TEXCOORD_1:"uv1",TEXCOORD_2:"uv2",TEXCOORD_3:"uv3",COLOR_0:"color",WEIGHTS_0:"skinWeight",JOINTS_0:"skinIndex"},ui={scale:"scale",translation:"position",rotation:"quaternion",weights:"morphTargetInfluences"},yx={CUBICSPLINE:void 0,LINEAR:ls,STEP:as},la={OPAQUE:"OPAQUE",MASK:"MASK",BLEND:"BLEND"};function Tx(i){return i.DefaultMaterial===void 0&&(i.DefaultMaterial=new wo({color:16777215,emissive:0,metalness:1,roughness:1,transparent:!1,depthTest:!0,side:gi})),i.DefaultMaterial}function Ci(i,e,t){for(const n in t.extensions)i[n]===void 0&&(e.userData.gltfExtensions=e.userData.gltfExtensions||{},e.userData.gltfExtensions[n]=t.extensions[n])}function In(i,e){e.extras!==void 0&&(typeof e.extras=="object"?Object.assign(i.userData,e.extras):console.warn("THREE.GLTFLoader: Ignoring primitive type .extras, "+e.extras))}function Ex(i,e,t){let n=!1,r=!1,s=!1;for(let c=0,u=e.length;c<u;c++){const h=e[c];if(h.POSITION!==void 0&&(n=!0),h.NORMAL!==void 0&&(r=!0),h.COLOR_0!==void 0&&(s=!0),n&&r&&s)break}if(!n&&!r&&!s)return Promise.resolve(i);const o=[],a=[],l=[];for(let c=0,u=e.length;c<u;c++){const h=e[c];if(n){const d=h.POSITION!==void 0?t.getDependency("accessor",h.POSITION):i.attributes.position;o.push(d)}if(r){const d=h.NORMAL!==void 0?t.getDependency("accessor",h.NORMAL):i.attributes.normal;a.push(d)}if(s){const d=h.COLOR_0!==void 0?t.getDependency("accessor",h.COLOR_0):i.attributes.color;l.push(d)}}return Promise.all([Promise.all(o),Promise.all(a),Promise.all(l)]).then(function(c){const u=c[0],h=c[1],d=c[2];return n&&(i.morphAttributes.position=u),r&&(i.morphAttributes.normal=h),s&&(i.morphAttributes.color=d),i.morphTargetsRelative=!0,i})}function bx(i,e){if(i.updateMorphTargets(),e.weights!==void 0)for(let t=0,n=e.weights.length;t<n;t++)i.morphTargetInfluences[t]=e.weights[t];if(e.extras&&Array.isArray(e.extras.targetNames)){const t=e.extras.targetNames;if(i.morphTargetInfluences.length===t.length){i.morphTargetDictionary={};for(let n=0,r=t.length;n<r;n++)i.morphTargetDictionary[t[n]]=n}else console.warn("THREE.GLTFLoader: Invalid extras.targetNames length. Ignoring names.")}}function Ax(i){let e;const t=i.extensions&&i.extensions[je.KHR_DRACO_MESH_COMPRESSION];if(t?e="draco:"+t.bufferView+":"+t.indices+":"+ca(t.attributes):e=i.indices+":"+ca(i.attributes)+":"+i.mode,i.targets!==void 0)for(let n=0,r=i.targets.length;n<r;n++)e+=":"+ca(i.targets[n]);return e}function ca(i){let e="";const t=Object.keys(i).sort();for(let n=0,r=t.length;n<r;n++)e+=t[n]+":"+i[t[n]]+";";return e}function fl(i){switch(i){case Int8Array:return 1/127;case Uint8Array:return 1/255;case Int16Array:return 1/32767;case Uint16Array:return 1/65535;default:throw new Error("THREE.GLTFLoader: Unsupported normalized accessor component type.")}}function wx(i){return i.search(/\.jpe?g($|\?)/i)>0||i.search(/^data\:image\/jpeg/)===0?"image/jpeg":i.search(/\.webp($|\?)/i)>0||i.search(/^data\:image\/webp/)===0?"image/webp":i.search(/\.ktx2($|\?)/i)>0||i.search(/^data\:image\/ktx2/)===0?"image/ktx2":"image/png"}const Rx=new Ve;class Cx{constructor(e={},t={}){this.json=e,this.extensions={},this.plugins={},this.options=t,this.cache=new Jv,this.associations=new Map,this.primitiveCache={},this.nodeCache={},this.meshCache={refs:{},uses:{}},this.cameraCache={refs:{},uses:{}},this.lightCache={refs:{},uses:{}},this.sourceCache={},this.textureCache={},this.nodeNamesUsed={};let n=!1,r=-1,s=!1,o=-1;if(typeof navigator<"u"&&typeof navigator.userAgent<"u"){const a=navigator.userAgent;n=/^((?!chrome|android).)*safari/i.test(a)===!0;const l=a.match(/Version\/(\d+)/);r=n&&l?parseInt(l[1],10):-1,s=a.indexOf("Firefox")>-1,o=s?a.match(/Firefox\/([0-9]+)\./)[1]:-1}typeof createImageBitmap>"u"||n&&r<17||s&&o<98?(this.textureLoader=new U0(this.options.manager),this.textureLoader.setPriority(this.options.priority),this.textureLoader.setCache(this.options.cache)):(this.textureLoader=new G0(this.options.manager),this.textureLoader.setPriority(this.options.priority),this.textureLoader.setCache(this.options.cache)),this.textureLoader.setCrossOrigin(this.options.crossOrigin),this.textureLoader.setWithCredentials(this.options.withCredentials),this.textureLoader.setRequestHeader(this.options.requestHeader),this.fileLoader=new Qh(this.options.manager),this.fileLoader.setPriority(this.options.priority),this.fileLoader.setCache(this.options.cache),this.fileLoader.setResponseType("arraybuffer"),(this.options.withCredentials||this.options.crossOrigin==="use-credentials")&&this.fileLoader.setWithCredentials(!0)}setExtensions(e){this.extensions=e}setPlugins(e){this.plugins=e}parse(e,t){const n=this,r=this.json,s=this.extensions;this.cache.removeAll(),this.nodeCache={},this._invokeAll(function(o){return o._markDefs&&o._markDefs()}),Promise.all(this._invokeAll(function(o){return o.beforeRoot&&o.beforeRoot()})).then(function(){return Promise.all([n.getDependencies("scene"),n.getDependencies("animation"),n.getDependencies("camera")])}).then(function(o){const a={scene:o[0][r.scene||0],scenes:o[0],animations:o[1],cameras:o[2],asset:r.asset,parser:n,userData:{}};return Ci(s,a,r),In(a,r),Promise.all(n._invokeAll(function(l){return l.afterRoot&&l.afterRoot(a)})).then(function(){for(const l of a.scenes)l.updateMatrixWorld();e(a)})}).catch(t)}_markDefs(){const e=this.json.nodes||[],t=this.json.skins||[],n=this.json.meshes||[];for(let r=0,s=t.length;r<s;r++){const o=t[r].joints;for(let a=0,l=o.length;a<l;a++)e[o[a]].isBone=!0}for(let r=0,s=e.length;r<s;r++){const o=e[r];o.mesh!==void 0&&(this._addNodeRef(this.meshCache,o.mesh),o.skin!==void 0&&(n[o.mesh].isSkinnedMesh=!0)),o.camera!==void 0&&this._addNodeRef(this.cameraCache,o.camera)}}_addNodeRef(e,t){t!==void 0&&(e.refs[t]===void 0&&(e.refs[t]=e.uses[t]=0),e.refs[t]++)}_getNodeRef(e,t,n){if(e.refs[t]<=1)return n;const r=n.clone(),s=(o,a)=>{const l=this.associations.get(o);l!=null&&this.associations.set(a,l);for(const[c,u]of o.children.entries())s(u,a.children[c])};return s(n,r),r.name+="_instance_"+e.uses[t]++,r}_invokeOne(e){const t=Object.values(this.plugins);t.push(this);for(let n=0;n<t.length;n++){const r=e(t[n]);if(r)return r}return null}_invokeAll(e){const t=Object.values(this.plugins);t.unshift(this);const n=[];for(let r=0;r<t.length;r++){const s=e(t[r]);s&&n.push(s)}return n}getDependency(e,t){const n=e+":"+t;let r=this.cache.get(n);if(!r){switch(e){case"scene":r=this.loadScene(t);break;case"node":r=this._invokeOne(function(s){return s.loadNode&&s.loadNode(t)});break;case"mesh":r=this._invokeOne(function(s){return s.loadMesh&&s.loadMesh(t)});break;case"accessor":r=this.loadAccessor(t);break;case"bufferView":r=this._invokeOne(function(s){return s.loadBufferView&&s.loadBufferView(t)});break;case"buffer":r=this.loadBuffer(t);break;case"material":r=this._invokeOne(function(s){return s.loadMaterial&&s.loadMaterial(t)});break;case"texture":r=this._invokeOne(function(s){return s.loadTexture&&s.loadTexture(t)});break;case"skin":r=this.loadSkin(t);break;case"animation":r=this._invokeOne(function(s){return s.loadAnimation&&s.loadAnimation(t)});break;case"camera":r=this.loadCamera(t);break;default:if(r=this._invokeOne(function(s){return s!=this&&s.getDependency&&s.getDependency(e,t)}),!r)throw new Error("Unknown type: "+e);break}this.cache.add(n,r)}return r}getDependencies(e){let t=this.cache.get(e);if(!t){const n=this,r=this.json[e+(e==="mesh"?"es":"s")]||[];t=Promise.all(r.map(function(s,o){return n.getDependency(e,o)})),this.cache.add(e,t)}return t}loadBuffer(e){const t=this.json.buffers[e],n=this.fileLoader;if(t.type&&t.type!=="arraybuffer")throw new Error("THREE.GLTFLoader: "+t.type+" buffer type is not supported.");if(t.uri===void 0&&e===0)return Promise.resolve(this.extensions[je.KHR_BINARY_GLTF].body);const r=this.options;return new Promise(function(s,o){n.load(is.resolveURL(t.uri,r.path),s,void 0,function(){o(new Error('THREE.GLTFLoader: Failed to load buffer "'+t.uri+'".'))})})}loadBufferView(e){const t=this.json.bufferViews[e];return this.getDependency("buffer",t.buffer).then(function(n){const r=t.byteLength||0,s=t.byteOffset||0;return n.slice(s,s+r)})}loadAccessor(e){const t=this,n=this.json,r=this.json.accessors[e];if(r.bufferView===void 0&&r.sparse===void 0){const o=aa[r.type],a=pr[r.componentType],l=r.normalized===!0,c=new a(r.count*o);return Promise.resolve(new vt(c,o,l))}const s=[];return r.bufferView!==void 0?s.push(this.getDependency("bufferView",r.bufferView)):s.push(null),r.sparse!==void 0&&(s.push(this.getDependency("bufferView",r.sparse.indices.bufferView)),s.push(this.getDependency("bufferView",r.sparse.values.bufferView))),Promise.all(s).then(function(o){const a=o[0],l=aa[r.type],c=pr[r.componentType],u=c.BYTES_PER_ELEMENT,h=u*l,d=r.byteOffset||0,f=r.bufferView!==void 0?n.bufferViews[r.bufferView].byteStride:void 0,g=r.normalized===!0;let v,p;if(f&&f!==h){const m=Math.floor(d/f),x="InterleavedBuffer:"+r.bufferView+":"+r.componentType+":"+m+":"+r.count;let A=t.cache.get(x);A||(v=new c(a,m*f,r.count*f/u),A=new Il(v,f/u),t.cache.add(x,A)),p=new ms(A,l,d%f/u,g)}else a===null?v=new c(r.count*l):v=new c(a,d,r.count*l),p=new vt(v,l,g);if(r.sparse!==void 0){const m=aa.SCALAR,x=pr[r.sparse.indices.componentType],A=r.sparse.indices.byteOffset||0,y=r.sparse.values.byteOffset||0,b=new x(o[1],A,r.sparse.count*m),E=new c(o[2],y,r.sparse.count*l);a!==null&&(p=new vt(p.array.slice(),p.itemSize,p.normalized)),p.normalized=!1;for(let _=0,S=b.length;_<S;_++){const D=b[_];if(p.setX(D,E[_*l]),l>=2&&p.setY(D,E[_*l+1]),l>=3&&p.setZ(D,E[_*l+2]),l>=4&&p.setW(D,E[_*l+3]),l>=5)throw new Error("THREE.GLTFLoader: Unsupported itemSize in sparse BufferAttribute.")}p.normalized=g}return p})}loadTexture(e){const t=this.json,n=this.options,s=t.textures[e].source,o=t.images[s];let a=this.textureLoader;if(o.uri){const l=n.manager.getHandler(o.uri);l!==null&&(a=l)}return this.loadTextureImage(e,s,a)}loadTextureImage(e,t,n){const r=this,s=this.json,o=s.textures[e],a=s.images[t],l=(a.uri||a.bufferView)+":"+o.sampler;if(this.textureCache[l])return this.textureCache[l];const c=this.loadImageSource(t,n).then(function(u){u.flipY=!1,u.name=o.name||a.name||"",u.name===""&&typeof a.uri=="string"&&a.uri.startsWith("data:image/")===!1&&(u.name=a.uri);const d=(s.samplers||{})[o.sampler]||{};return u.magFilter=Mu[d.magFilter]||Bt,u.minFilter=Mu[d.minFilter]||vn,u.wrapS=Su[d.wrapS]||_i,u.wrapT=Su[d.wrapT]||_i,u.generateMipmaps=!u.isCompressedTexture&&u.minFilter!==It&&u.minFilter!==Bt,r.associations.set(u,{textures:e}),u}).catch(function(){return null});return this.textureCache[l]=c,c}loadImageSource(e,t){const n=this,r=this.json,s=this.options;if(this.sourceCache[e]!==void 0)return this.sourceCache[e].then(d=>d.clone());const o=r.images[e],a=self.URL||self.webkitURL;let l=o.uri||"",c=!1,u;if(t.isKTX2Loader===!0&&o.bufferView!==void 0)u=n.getDependency("bufferView",o.bufferView).then(function(d){return new Promise(function(f,g){t.parse(d,f,g)})});else{if(o.bufferView!==void 0)l=n.getDependency("bufferView",o.bufferView).then(function(d){c=!0;const f=new Blob([d],{type:o.mimeType});return l=a.createObjectURL(f),l});else if(o.uri===void 0)throw new Error("THREE.GLTFLoader: Image "+e+" is missing URI and bufferView");u=Promise.resolve(l).then(function(d){return new Promise(function(f,g){let v=f;t.isImageBitmapLoader===!0&&(v=function(p){const m=new Lt(p);m.needsUpdate=!0,f(m)}),t.load(is.resolveURL(d,s.path),v,void 0,g)})})}const h=u.then(function(d){return c===!0&&a.revokeObjectURL(l),In(d,o),d.userData.mimeType=o.mimeType||wx(o.uri),d}).catch(function(d){throw console.error("THREE.GLTFLoader: Couldn't load texture",l),d});return this.sourceCache[e]=h,h}assignTexture(e,t,n,r){const s=this;return this.getDependency("texture",n.index).then(function(o){if(!o)return null;if(n.texCoord!==void 0&&n.texCoord>0&&(o=o.clone(),o.channel=n.texCoord),s.extensions[je.KHR_TEXTURE_TRANSFORM]){const a=n.extensions!==void 0?n.extensions[je.KHR_TEXTURE_TRANSFORM]:void 0;if(a){const l=s.associations.get(o);o=s.extensions[je.KHR_TEXTURE_TRANSFORM].extendTexture(o,a),s.associations.set(o,l)}}return r!==void 0&&(o.colorSpace=r),e[t]=o,o})}assignFinalMaterial(e){const t=e.geometry;let n=e.material;const r=t.attributes.tangent===void 0,s=t.attributes.color!==void 0,o=t.attributes.normal===void 0;if(e.isPoints){const a="PointsMaterial:"+n.uuid;let l=this.cache.get(a);l||(l=new Wh,Sn.prototype.copy.call(l,n),l.color.copy(n.color),l.map=n.map,l.sizeAttenuation=!1,this.cache.add(a,l)),n=l}else if(e.isLine){const a="LineBasicMaterial:"+n.uuid;let l=this.cache.get(a);l||(l=new Bi,Sn.prototype.copy.call(l,n),l.color.copy(n.color),l.map=n.map,this.cache.add(a,l)),n=l}if(r||s||o){let a="ClonedMaterial:"+n.uuid+":";r&&(a+="derivative-tangents:"),s&&(a+="vertex-colors:"),o&&(a+="flat-shading:");let l=this.cache.get(a);l||(l=n.clone(),s&&(l.vertexColors=!0),o&&(l.flatShading=!0),r&&(l.normalScale&&(l.normalScale.y*=-1),l.clearcoatNormalScale&&(l.clearcoatNormalScale.y*=-1)),this.cache.add(a,l),this.associations.set(l,this.associations.get(n))),n=l}e.material=n}getMaterialType(){return wo}loadMaterial(e){const t=this,n=this.json,r=this.extensions,s=n.materials[e];let o;const a={},l=s.extensions||{},c=[];if(l[je.KHR_MATERIALS_UNLIT]){const h=r[je.KHR_MATERIALS_UNLIT];o=h.getMaterialType(),c.push(h.extendParams(a,s,t))}else{const h=s.pbrMetallicRoughness||{};if(a.color=new Ne(1,1,1),a.opacity=1,Array.isArray(h.baseColorFactor)){const d=h.baseColorFactor;a.color.setRGB(d[0],d[1],d[2],tn),a.opacity=d[3]}h.baseColorTexture!==void 0&&c.push(t.assignTexture(a,"map",h.baseColorTexture,Pt)),a.metalness=h.metallicFactor!==void 0?h.metallicFactor:1,a.roughness=h.roughnessFactor!==void 0?h.roughnessFactor:1,h.metallicRoughnessTexture!==void 0&&(c.push(t.assignTexture(a,"metalnessMap",h.metallicRoughnessTexture)),c.push(t.assignTexture(a,"roughnessMap",h.metallicRoughnessTexture))),o=this._invokeOne(function(d){return d.getMaterialType&&d.getMaterialType(e)}),c.push(Promise.all(this._invokeAll(function(d){return d.extendMaterialParams&&d.extendMaterialParams(e,a)})))}s.doubleSided===!0&&(a.side=jt);const u=s.alphaMode||la.OPAQUE;if(u===la.BLEND?(a.transparent=!0,a.depthWrite=!1):(a.transparent=!1,u===la.MASK&&(a.alphaTest=s.alphaCutoff!==void 0?s.alphaCutoff:.5)),s.normalTexture!==void 0&&o!==Un&&(c.push(t.assignTexture(a,"normalMap",s.normalTexture)),a.normalScale=new Ye(1,1),s.normalTexture.scale!==void 0)){const h=s.normalTexture.scale;a.normalScale.set(h,h)}if(s.occlusionTexture!==void 0&&o!==Un&&(c.push(t.assignTexture(a,"aoMap",s.occlusionTexture)),s.occlusionTexture.strength!==void 0&&(a.aoMapIntensity=s.occlusionTexture.strength)),s.emissiveFactor!==void 0&&o!==Un){const h=s.emissiveFactor;a.emissive=new Ne().setRGB(h[0],h[1],h[2],tn)}return s.emissiveTexture!==void 0&&o!==Un&&c.push(t.assignTexture(a,"emissiveMap",s.emissiveTexture,Pt)),Promise.all(c).then(function(){const h=new o(a);return s.name&&(h.name=s.name),In(h,s),t.associations.set(h,{materials:e}),s.extensions&&Ci(r,h,s),h})}createUniqueName(e){const t=_t.sanitizeNodeName(e||"");return t in this.nodeNamesUsed?t+"_"+ ++this.nodeNamesUsed[t]:(this.nodeNamesUsed[t]=0,t)}loadGeometries(e){const t=this,n=this.extensions,r=this.primitiveCache;function s(a){return n[je.KHR_DRACO_MESH_COMPRESSION].decodePrimitive(a,t).then(function(l){return yu(l,a,t)})}const o=[];for(let a=0,l=e.length;a<l;a++){const c=e[a],u=Ax(c),h=r[u];if(h)o.push(h.promise);else{let d;c.extensions&&c.extensions[je.KHR_DRACO_MESH_COMPRESSION]?d=s(c):d=yu(new Et,c,t),c.mode===an.TRIANGLE_STRIP?d=d.then(f=>_u(f,Ph)):c.mode===an.TRIANGLE_FAN&&(d=d.then(f=>_u(f,al))),r[u]={primitive:c,promise:d},o.push(d)}}return Promise.all(o)}loadMesh(e){const t=this,n=this.json,r=this.extensions,s=n.meshes[e],o=s.primitives,a=[];for(let l=0,c=o.length;l<c;l++){const u=o[l].material===void 0?Tx(this.cache):this.getDependency("material",o[l].material);a.push(u)}return a.push(t.loadGeometries(o)),Promise.all(a).then(async function(l){const c=l.slice(0,l.length-1),u=l[l.length-1],h=[];for(let f=0,g=u.length;f<g;f++){const v=u[f],p=o[f];let m;const x=c[f];if(p.mode===an.TRIANGLES||p.mode===an.TRIANGLE_STRIP||p.mode===an.TRIANGLE_FAN||p.mode===void 0){const A=s.isSkinnedMesh===!0,y=v.hasAttribute("skinIndex")&&v.hasAttribute("skinWeight");A&&y===!1&&console.warn("THREE.GLTFLoader: Missing skinIndex or skinWeight attributes. Skinning disabled."),m=A&&y?new zh(v,x):new wt(v,x),m.isSkinnedMesh===!0&&m.normalizeSkinWeights()}else if(p.mode===an.LINES)m=new gs(v,x);else if(p.mode===an.LINE_STRIP)m=new Ao(v,x);else if(p.mode===an.LINE_LOOP)m=new d0(v,x);else if(p.mode===an.POINTS)m=new f0(v,x);else throw new Error("THREE.GLTFLoader: Primitive mode unsupported: "+p.mode);Object.keys(m.geometry.morphAttributes).length>0&&bx(m,s),m.name=t.createUniqueName(s.name||"mesh_"+e),In(m,s),p.extensions&&Ci(r,m,p),t.assignFinalMaterial(m),h.push(m)}for(let f=0,g=h.length;f<g;f++)t.associations.set(h[f],{meshes:e,primitives:f});if(h.length===1)return s.extensions&&Ci(r,h[0],s),h[0];const d=new $t;s.extensions&&Ci(r,d,s),t.associations.set(d,{meshes:e});for(let f=0,g=h.length;f<g;f++)d.add(h[f]);return d})}loadCamera(e){let t;const n=this.json.cameras[e],r=n[n.type];if(!r){console.warn("THREE.GLTFLoader: Missing camera parameters.");return}return n.type==="perspective"?t=new Kt(ut.radToDeg(r.yfov),r.aspectRatio||1,r.znear||1,r.zfar||2e6):n.type==="orthographic"&&(t=new Bl(-r.xmag,r.xmag,r.ymag,-r.ymag,r.znear,r.zfar)),n.name&&(t.name=this.createUniqueName(n.name)),In(t,n),Promise.resolve(t)}loadSkin(e){const t=this.json.skins[e],n=[];for(let r=0,s=t.joints.length;r<s;r++)n.push(this._loadNodeShallow(t.joints[r]));return t.inverseBindMatrices!==void 0?n.push(this.getDependency("accessor",t.inverseBindMatrices)):n.push(null),Promise.all(n).then(function(r){const s=r.pop(),o=r,a=[],l=[];for(let c=0,u=o.length;c<u;c++){const h=o[c];if(h){a.push(h);const d=new Ve;s!==null&&d.fromArray(s.array,c*16),l.push(d)}else console.warn('THREE.GLTFLoader: Joint "%s" could not be found.',t.joints[c])}return new yr(a,l)})}loadAnimation(e){const t=this.json,n=this,r=t.animations[e],s=r.name?r.name:"animation_"+e,o=[],a=[],l=[],c=[],u=[];for(let h=0,d=r.channels.length;h<d;h++){const f=r.channels[h],g=r.samplers[f.sampler],v=f.target,p=v.node,m=r.parameters!==void 0?r.parameters[g.input]:g.input,x=r.parameters!==void 0?r.parameters[g.output]:g.output;v.node!==void 0&&(o.push(this.getDependency("node",p)),a.push(this.getDependency("accessor",m)),l.push(this.getDependency("accessor",x)),c.push(g),u.push(v))}return Promise.all([Promise.all(o),Promise.all(a),Promise.all(l),Promise.all(c),Promise.all(u)]).then(function(h){const d=h[0],f=h[1],g=h[2],v=h[3],p=h[4],m=[];for(let A=0,y=d.length;A<y;A++){const b=d[A],E=f[A],_=g[A],S=v[A],D=p[A];if(b===void 0)continue;b.updateMatrix&&b.updateMatrix();const R=n._createAnimationTracks(b,E,_,S,D);if(R)for(let N=0;N<R.length;N++)m.push(R[N])}const x=new C0(s,void 0,m);return In(x,r),x})}createNodeMesh(e){const t=this.json,n=this,r=t.nodes[e];return r.mesh===void 0?null:n.getDependency("mesh",r.mesh).then(function(s){const o=n._getNodeRef(n.meshCache,r.mesh,s);return r.weights!==void 0&&o.traverse(function(a){if(a.isMesh)for(let l=0,c=r.weights.length;l<c;l++)a.morphTargetInfluences[l]=r.weights[l]}),o})}loadNode(e){const t=this.json,n=this,r=t.nodes[e],s=n._loadNodeShallow(e),o=[],a=r.children||[];for(let c=0,u=a.length;c<u;c++)o.push(n.getDependency("node",a[c]));const l=r.skin===void 0?Promise.resolve(null):n.getDependency("skin",r.skin);return Promise.all([s,Promise.all(o),l]).then(function(c){const u=c[0],h=c[1],d=c[2];d!==null&&u.traverse(function(f){f.isSkinnedMesh&&f.bind(d,Rx)});for(let f=0,g=h.length;f<g;f++)u.add(h[f]);if(u.userData.pivot!==void 0&&h.length>0){const f=u.userData.pivot,g=h[0];u.pivot=new C().fromArray(f),u.position.x-=f[0],u.position.y-=f[1],u.position.z-=f[2],g.position.set(0,0,0),delete u.userData.pivot}return u})}_loadNodeShallow(e){const t=this.json,n=this.extensions,r=this;if(this.nodeCache[e]!==void 0)return this.nodeCache[e];const s=t.nodes[e],o=s.name?r.createUniqueName(s.name):"",a=[],l=r._invokeOne(function(c){return c.createNodeMesh&&c.createNodeMesh(e)});return l&&a.push(l),s.camera!==void 0&&a.push(r.getDependency("camera",s.camera).then(function(c){return r._getNodeRef(r.cameraCache,s.camera,c)})),r._invokeAll(function(c){return c.createNodeAttachment&&c.createNodeAttachment(e)}).forEach(function(c){a.push(c)}),this.nodeCache[e]=Promise.all(a).then(function(c){let u;if(s.isBone===!0?u=new Gh:c.length>1?u=new $t:c.length===1?u=c[0]:u=new ft,u!==c[0])for(let h=0,d=c.length;h<d;h++)u.add(c[h]);if(s.name&&(u.userData.name=s.name,u.name=o),In(u,s),s.extensions&&Ci(n,u,s),s.matrix!==void 0){const h=new Ve;h.fromArray(s.matrix),u.applyMatrix4(h)}else s.translation!==void 0&&u.position.fromArray(s.translation),s.rotation!==void 0&&u.quaternion.fromArray(s.rotation),s.scale!==void 0&&u.scale.fromArray(s.scale);if(!r.associations.has(u))r.associations.set(u,{});else if(s.mesh!==void 0&&r.meshCache.refs[s.mesh]>1){const h=r.associations.get(u);r.associations.set(u,{...h})}return r.associations.get(u).nodes=e,u}),this.nodeCache[e]}loadScene(e){const t=this.extensions,n=this.json.scenes[e],r=this,s=new $t;n.name&&(s.name=r.createUniqueName(n.name)),In(s,n),n.extensions&&Ci(t,s,n);const o=n.nodes||[],a=[];for(let l=0,c=o.length;l<c;l++)a.push(r.getDependency("node",o[l]));return Promise.all(a).then(function(l){for(let u=0,h=l.length;u<h;u++){const d=l[u];d.parent!==null?s.add($v(d)):s.add(d)}const c=u=>{const h=new Map;for(const[d,f]of r.associations)(d instanceof Sn||d instanceof Lt)&&h.set(d,f);return u.traverse(d=>{const f=r.associations.get(d);f!=null&&h.set(d,f)}),h};return r.associations=c(s),s})}_createAnimationTracks(e,t,n,r,s){const o=[],a=e.name?e.name:e.uuid,l=[];function c(f){f.morphTargetInfluences&&l.push(f.name?f.name:f.uuid)}ui[s.path]===ui.weights?(c(e),e.isGroup&&e.children.forEach(c)):l.push(a);let u;switch(ui[s.path]){case ui.weights:u=ds;break;case ui.rotation:u=fs;break;case ui.translation:case ui.scale:u=_o;break;default:n.itemSize===1?u=ds:u=_o;break}const h=r.interpolation!==void 0?yx[r.interpolation]:ls,d=this._getArrayFromAccessor(n);for(let f=0,g=l.length;f<g;f++){const v=new u(l[f]+"."+ui[s.path],t.array,d,h);r.interpolation==="CUBICSPLINE"&&this._createCubicSplineTrackInterpolant(v),o.push(v)}return o}_getArrayFromAccessor(e){let t=e.array;if(e.normalized){const n=fl(t.constructor),r=new Float32Array(t.length);for(let s=0,o=t.length;s<o;s++)r[s]=t[s]*n;t=r}return t}_createCubicSplineTrackInterpolant(e){e.createInterpolant=function(n){const r=this instanceof fs?Sx:pd;return new r(this.times,this.values,this.getValueSize()/3,n)},e.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline=!0}}function Px(i,e,t){const n=e.attributes,r=new Vn;if(n.POSITION!==void 0){const a=t.json.accessors[n.POSITION],l=a.min,c=a.max;if(l!==void 0&&c!==void 0){if(r.set(new C(l[0],l[1],l[2]),new C(c[0],c[1],c[2])),a.normalized){const u=fl(pr[a.componentType]);r.min.multiplyScalar(u),r.max.multiplyScalar(u)}}else{console.warn("THREE.GLTFLoader: Missing min/max properties for accessor POSITION.");return}}else return;const s=e.targets;if(s!==void 0){const a=new C,l=new C;for(let c=0,u=s.length;c<u;c++){const h=s[c];if(h.POSITION!==void 0){const d=t.json.accessors[h.POSITION],f=d.min,g=d.max;if(f!==void 0&&g!==void 0){if(l.setX(Math.max(Math.abs(f[0]),Math.abs(g[0]))),l.setY(Math.max(Math.abs(f[1]),Math.abs(g[1]))),l.setZ(Math.max(Math.abs(f[2]),Math.abs(g[2]))),d.normalized){const v=fl(pr[d.componentType]);l.multiplyScalar(v)}a.max(l)}else console.warn("THREE.GLTFLoader: Missing min/max properties for accessor POSITION.")}}r.expandByVector(a)}i.boundingBox=r;const o=new Hn;r.getCenter(o.center),o.radius=r.min.distanceTo(r.max)/2,i.boundingSphere=o}function yu(i,e,t){const n=e.attributes,r=[];function s(o,a){return t.getDependency("accessor",o).then(function(l){i.setAttribute(a,l)})}for(const o in n){const a=dl[o]||o.toLowerCase();a in i.attributes||r.push(s(n[o],a))}if(e.indices!==void 0&&!i.index){const o=t.getDependency("accessor",e.indices).then(function(a){i.setIndex(a)});r.push(o)}return tt.workingColorSpace!==tn&&"COLOR_0"in n&&console.warn(`THREE.GLTFLoader: Converting vertex colors from "srgb-linear" to "${tt.workingColorSpace}" not supported.`),In(i,e),Px(i,e,t),Promise.all(r).then(function(){return e.targets!==void 0?Ex(i,e.targets,t):i})}var Ks=(i,e,t)=>new Promise((n,r)=>{var s=l=>{try{a(t.next(l))}catch(c){r(c)}},o=l=>{try{a(t.throw(l))}catch(c){r(c)}},a=l=>l.done?n(l.value):Promise.resolve(l.value).then(s,o);a((t=t.apply(i,e)).next())}),ct=(i,e,t)=>new Promise((n,r)=>{var s=l=>{try{a(t.next(l))}catch(c){r(c)}},o=l=>{try{a(t.throw(l))}catch(c){r(c)}},a=l=>l.done?n(l.value):Promise.resolve(l.value).then(s,o);a((t=t.apply(i,e)).next())}),Tu=class extends ft{constructor(i){super(),this.weight=0,this.isBinary=!1,this.overrideBlink="none",this.overrideLookAt="none",this.overrideMouth="none",this._binds=[],this.name=`VRMExpression_${i}`,this.expressionName=i,this.type="VRMExpression",this.visible=!1}get binds(){return this._binds}get overrideBlinkAmount(){return this.overrideBlink==="block"?0<this.outputWeight?1:0:this.overrideBlink==="blend"?this.outputWeight:0}get overrideLookAtAmount(){return this.overrideLookAt==="block"?0<this.outputWeight?1:0:this.overrideLookAt==="blend"?this.outputWeight:0}get overrideMouthAmount(){return this.overrideMouth==="block"?0<this.outputWeight?1:0:this.overrideMouth==="blend"?this.outputWeight:0}get outputWeight(){return this.isBinary?this.weight>.5?1:0:this.weight}addBind(i){this._binds.push(i)}deleteBind(i){const e=this._binds.indexOf(i);e>=0&&this._binds.splice(e,1)}applyWeight(i){var e;let t=this.outputWeight;t*=(e=i?.multiplier)!=null?e:1,this.isBinary&&t<1&&(t=0),this._binds.forEach(n=>n.applyWeight(t))}clearAppliedWeight(){this._binds.forEach(i=>i.clearAppliedWeight())}};function md(i,e,t){var n,r;const s=i.parser.json,o=(n=s.nodes)==null?void 0:n[e];if(o==null)return console.warn(`extractPrimitivesInternal: Attempt to use nodes[${e}] of glTF but the node doesn't exist`),null;const a=o.mesh;if(a==null)return null;const l=(r=s.meshes)==null?void 0:r[a];if(l==null)return console.warn(`extractPrimitivesInternal: Attempt to use meshes[${a}] of glTF but the mesh doesn't exist`),null;const c=l.primitives.length,u=[];return t.traverse(h=>{u.length<c&&h.isMesh&&u.push(h)}),u}function Eu(i,e){return ct(this,null,function*(){const t=yield i.parser.getDependency("node",e);return md(i,e,t)})}function bu(i){return ct(this,null,function*(){const e=yield i.parser.getDependencies("node"),t=new Map;return e.forEach((n,r)=>{const s=md(i,r,n);s!=null&&t.set(r,s)}),t})}var pl={Aa:"aa",Ih:"ih",Ou:"ou",Ee:"ee",Oh:"oh",Blink:"blink",Happy:"happy",Angry:"angry",Sad:"sad",Relaxed:"relaxed",LookUp:"lookUp",Surprised:"surprised",LookDown:"lookDown",LookLeft:"lookLeft",LookRight:"lookRight",BlinkLeft:"blinkLeft",BlinkRight:"blinkRight",Neutral:"neutral"};function gd(i){return Math.max(Math.min(i,1),0)}var Au=class _d{constructor(){this.blinkExpressionNames=["blink","blinkLeft","blinkRight"],this.lookAtExpressionNames=["lookLeft","lookRight","lookUp","lookDown"],this.mouthExpressionNames=["aa","ee","ih","oh","ou"],this._expressions=[],this._expressionMap={}}get expressions(){return this._expressions.concat()}get expressionMap(){return Object.assign({},this._expressionMap)}get presetExpressionMap(){const e={},t=new Set(Object.values(pl));return Object.entries(this._expressionMap).forEach(([n,r])=>{t.has(n)&&(e[n]=r)}),e}get customExpressionMap(){const e={},t=new Set(Object.values(pl));return Object.entries(this._expressionMap).forEach(([n,r])=>{t.has(n)||(e[n]=r)}),e}copy(e){return this._expressions.concat().forEach(n=>{this.unregisterExpression(n)}),e._expressions.forEach(n=>{this.registerExpression(n)}),this.blinkExpressionNames=e.blinkExpressionNames.concat(),this.lookAtExpressionNames=e.lookAtExpressionNames.concat(),this.mouthExpressionNames=e.mouthExpressionNames.concat(),this}clone(){return new _d().copy(this)}getExpression(e){var t;return(t=this._expressionMap[e])!=null?t:null}registerExpression(e){this._expressions.push(e),this._expressionMap[e.expressionName]=e}unregisterExpression(e){const t=this._expressions.indexOf(e);t===-1&&console.warn("VRMExpressionManager: The specified expressions is not registered"),this._expressions.splice(t,1),delete this._expressionMap[e.expressionName]}getValue(e){var t;const n=this.getExpression(e);return(t=n?.weight)!=null?t:null}setValue(e,t){const n=this.getExpression(e);n&&(n.weight=gd(t))}resetValues(){this._expressions.forEach(e=>{e.weight=0})}getExpressionTrackName(e){const t=this.getExpression(e);return t?`${t.name}.weight`:null}update(){const e=this._calculateWeightMultipliers();this._expressions.forEach(t=>{t.clearAppliedWeight()}),this._expressions.forEach(t=>{let n=1;const r=t.expressionName;this.blinkExpressionNames.indexOf(r)!==-1&&(n*=e.blink),this.lookAtExpressionNames.indexOf(r)!==-1&&(n*=e.lookAt),this.mouthExpressionNames.indexOf(r)!==-1&&(n*=e.mouth),t.applyWeight({multiplier:n})})}_calculateWeightMultipliers(){let e=1,t=1,n=1;return this._expressions.forEach(r=>{e-=r.overrideBlinkAmount,t-=r.overrideLookAtAmount,n-=r.overrideMouthAmount}),e=Math.max(0,e),t=Math.max(0,t),n=Math.max(0,n),{blink:e,lookAt:t,mouth:n}}},Hr={Color:"color",EmissionColor:"emissionColor",ShadeColor:"shadeColor",RimColor:"rimColor",OutlineColor:"outlineColor"},Lx={_Color:Hr.Color,_EmissionColor:Hr.EmissionColor,_ShadeColor:Hr.ShadeColor,_RimColor:Hr.RimColor,_OutlineColor:Hr.OutlineColor},Ix=new Ne,vd=class xd{constructor({material:e,type:t,targetValue:n,targetAlpha:r}){this.material=e,this.type=t,this.targetValue=n,this.targetAlpha=r??1;const s=this._initColorBindState(),o=this._initAlphaBindState();this._state={color:s,alpha:o}}applyWeight(e){const{color:t,alpha:n}=this._state;if(t!=null){const{propertyName:r,deltaValue:s}=t,o=this.material[r];o?.add(Ix.copy(s).multiplyScalar(e))}if(n!=null){const{propertyName:r,deltaValue:s}=n;this.material[r]!=null&&(this.material[r]+=s*e)}}clearAppliedWeight(){const{color:e,alpha:t}=this._state;if(e!=null){const{propertyName:n,initialValue:r}=e,s=this.material[n];s?.copy(r)}if(t!=null){const{propertyName:n,initialValue:r}=t;this.material[n]!=null&&(this.material[n]=r)}}_initColorBindState(){var e,t,n;const{material:r,type:s,targetValue:o}=this,a=this._getPropertyNameMap(),l=(t=(e=a?.[s])==null?void 0:e[0])!=null?t:null;if(l==null)return console.warn(`Tried to add a material color bind to the material ${(n=r.name)!=null?n:"(no name)"}, the type ${s} but the material or the type is not supported.`),null;const u=r[l].clone(),h=new Ne(o.r-u.r,o.g-u.g,o.b-u.b);return{propertyName:l,initialValue:u,deltaValue:h}}_initAlphaBindState(){var e,t,n;const{material:r,type:s,targetAlpha:o}=this,a=this._getPropertyNameMap(),l=(t=(e=a?.[s])==null?void 0:e[1])!=null?t:null;if(l==null&&o!==1)return console.warn(`Tried to add a material alpha bind to the material ${(n=r.name)!=null?n:"(no name)"}, the type ${s} but the material or the type does not support alpha.`),null;if(l==null)return null;const c=r[l],u=o-c;return{propertyName:l,initialValue:c,deltaValue:u}}_getPropertyNameMap(){var e,t;return(t=(e=Object.entries(xd._propertyNameMapMap).find(([n])=>this.material[n]===!0))==null?void 0:e[1])!=null?t:null}};vd._propertyNameMapMap={isMeshStandardMaterial:{color:["color","opacity"],emissionColor:["emissive",null]},isMeshBasicMaterial:{color:["color","opacity"]},isMToonMaterial:{color:["color","opacity"],emissionColor:["emissive",null],outlineColor:["outlineColorFactor",null],matcapColor:["matcapFactor",null],rimColor:["parametricRimColorFactor",null],shadeColor:["shadeColorFactor",null]}};var wu=vd,xo=class{constructor({primitives:i,index:e,weight:t}){this.primitives=i,this.index=e,this.weight=t}applyWeight(i){this.primitives.forEach(e=>{var t;((t=e.morphTargetInfluences)==null?void 0:t[this.index])!=null&&(e.morphTargetInfluences[this.index]+=this.weight*i)})}clearAppliedWeight(){this.primitives.forEach(i=>{var e;((e=i.morphTargetInfluences)==null?void 0:e[this.index])!=null&&(i.morphTargetInfluences[this.index]=0)})}},Ru=new Ye,Md=class Sd{constructor({material:e,scale:t,offset:n}){var r,s;this.material=e,this.scale=t,this.offset=n;const o=(r=Object.entries(Sd._propertyNamesMap).find(([a])=>e[a]===!0))==null?void 0:r[1];o==null?(console.warn(`Tried to add a texture transform bind to the material ${(s=e.name)!=null?s:"(no name)"} but the material is not supported.`),this._properties=[]):(this._properties=[],o.forEach(a=>{var l;const c=(l=e[a])==null?void 0:l.clone();if(!c)return null;e[a]=c;const u=c.offset.clone(),h=c.repeat.clone(),d=n.clone().sub(u),f=t.clone().sub(h);this._properties.push({name:a,initialOffset:u,deltaOffset:d,initialScale:h,deltaScale:f})}))}applyWeight(e){this._properties.forEach(t=>{const n=this.material[t.name];n!==void 0&&(n.offset.add(Ru.copy(t.deltaOffset).multiplyScalar(e)),n.repeat.add(Ru.copy(t.deltaScale).multiplyScalar(e)))})}clearAppliedWeight(){this._properties.forEach(e=>{const t=this.material[e.name];t!==void 0&&(t.offset.copy(e.initialOffset),t.repeat.copy(e.initialScale))})}};Md._propertyNamesMap={isMeshStandardMaterial:["map","emissiveMap","bumpMap","normalMap","displacementMap","roughnessMap","metalnessMap","alphaMap"],isMeshBasicMaterial:["map","specularMap","alphaMap"],isMToonMaterial:["map","normalMap","emissiveMap","shadeMultiplyTexture","rimMultiplyTexture","outlineWidthMultiplyTexture","uvAnimationMaskTexture"]};var Cu=Md,Nx=new Set(["1.0","1.0-beta"]),yd=class Td{get name(){return"VRMExpressionLoaderPlugin"}constructor(e){this.parser=e}afterRoot(e){return ct(this,null,function*(){e.userData.vrmExpressionManager=yield this._import(e)})}_import(e){return ct(this,null,function*(){const t=yield this._v1Import(e);if(t)return t;const n=yield this._v0Import(e);return n||null})}_v1Import(e){return ct(this,null,function*(){var t,n;const r=this.parser.json;if(!(((t=r.extensionsUsed)==null?void 0:t.indexOf("VRMC_vrm"))!==-1))return null;const o=(n=r.extensions)==null?void 0:n.VRMC_vrm;if(!o)return null;const a=o.specVersion;if(!Nx.has(a))return console.warn(`VRMExpressionLoaderPlugin: Unknown VRMC_vrm specVersion "${a}"`),null;const l=o.expressions;if(!l)return null;const c=new Set(Object.values(pl)),u=new Map;l.preset!=null&&Object.entries(l.preset).forEach(([d,f])=>{if(f!=null){if(!c.has(d)){console.warn(`VRMExpressionLoaderPlugin: Unknown preset name "${d}" detected. Ignoring the expression`);return}u.set(d,f)}}),l.custom!=null&&Object.entries(l.custom).forEach(([d,f])=>{if(c.has(d)){console.warn(`VRMExpressionLoaderPlugin: Custom expression cannot have preset name "${d}". Ignoring the expression`);return}u.set(d,f)});const h=new Au;return yield Promise.all(Array.from(u.entries()).map(d=>ct(this,[d],function*([f,g]){var v,p,m,x,A,y,b;const E=new Tu(f);if(e.scene.add(E),E.isBinary=(v=g.isBinary)!=null?v:!1,E.overrideBlink=(p=g.overrideBlink)!=null?p:"none",E.overrideLookAt=(m=g.overrideLookAt)!=null?m:"none",E.overrideMouth=(x=g.overrideMouth)!=null?x:"none",(A=g.morphTargetBinds)==null||A.forEach(_=>ct(this,null,function*(){var S;if(_.node===void 0||_.index===void 0)return;const D=yield Eu(e,_.node),R=_.index;if(!D.every(N=>Array.isArray(N.morphTargetInfluences)&&R<N.morphTargetInfluences.length)){console.warn(`VRMExpressionLoaderPlugin: ${g.name} attempts to index morph #${R} but not found.`);return}E.addBind(new xo({primitives:D,index:R,weight:(S=_.weight)!=null?S:1}))})),g.materialColorBinds||g.textureTransformBinds){const _=[];e.scene.traverse(S=>{const D=S.material;D&&(Array.isArray(D)?_.push(...D):_.push(D))}),(y=g.materialColorBinds)==null||y.forEach(S=>ct(this,null,function*(){_.filter(R=>{var N;const O=(N=this.parser.associations.get(R))==null?void 0:N.materials;return S.material===O}).forEach(R=>{E.addBind(new wu({material:R,type:S.type,targetValue:new Ne().fromArray(S.targetValue),targetAlpha:S.targetValue[3]}))})})),(b=g.textureTransformBinds)==null||b.forEach(S=>ct(this,null,function*(){_.filter(R=>{var N;const O=(N=this.parser.associations.get(R))==null?void 0:N.materials;return S.material===O}).forEach(R=>{var N,O;E.addBind(new Cu({material:R,offset:new Ye().fromArray((N=S.offset)!=null?N:[0,0]),scale:new Ye().fromArray((O=S.scale)!=null?O:[1,1])}))})}))}h.registerExpression(E)}))),h})}_v0Import(e){return ct(this,null,function*(){var t;const n=this.parser.json,r=(t=n.extensions)==null?void 0:t.VRM;if(!r)return null;const s=r.blendShapeMaster;if(!s)return null;const o=new Au,a=s.blendShapeGroups;if(!a)return o;const l=new Set;return yield Promise.all(a.map(c=>ct(this,null,function*(){var u;const h=c.presetName,d=h!=null&&Td.v0v1PresetNameMap[h]||null,f=d??c.name;if(f==null){console.warn("VRMExpressionLoaderPlugin: One of custom expressions has no name. Ignoring the expression");return}if(l.has(f)){console.warn(`VRMExpressionLoaderPlugin: An expression preset ${h} has duplicated entries. Ignoring the expression`);return}l.add(f);const g=new Tu(f);e.scene.add(g),g.isBinary=(u=c.isBinary)!=null?u:!1,c.binds&&c.binds.forEach(p=>ct(this,null,function*(){var m;if(p.mesh===void 0||p.index===void 0)return;const x=[];if((m=n.nodes)==null||m.forEach((y,b)=>{y.mesh===p.mesh&&x.push(b)}),x.length===0){console.warn(`VRMExpressionLoaderPlugin: ${c.name} attempts to bind a morph target to the mesh #${p.mesh} but the mesh is not found or not used in the scene. Ignoring the bind.`);return}const A=p.index;yield Promise.all(x.map(y=>ct(this,null,function*(){var b;const E=yield Eu(e,y);if(!E.every(_=>Array.isArray(_.morphTargetInfluences)&&A<_.morphTargetInfluences.length)){console.warn(`VRMExpressionLoaderPlugin: ${c.name} attempts to index ${A}th morph but not found.`);return}g.addBind(new xo({primitives:E,index:A,weight:.01*((b=p.weight)!=null?b:100)}))})))}));const v=c.materialValues;v&&v.length!==0&&v.forEach(p=>{if(p.materialName===void 0||p.propertyName===void 0||p.targetValue===void 0)return;const m=[];e.scene.traverse(A=>{if(A.material){const y=A.material;Array.isArray(y)?m.push(...y.filter(b=>(b.name===p.materialName||b.name===p.materialName+" (Outline)")&&m.indexOf(b)===-1)):y.name===p.materialName&&m.indexOf(y)===-1&&m.push(y)}});const x=p.propertyName;m.forEach(A=>{if(x==="_MainTex_ST"){const b=new Ye(p.targetValue[0],p.targetValue[1]),E=new Ye(p.targetValue[2],p.targetValue[3]);E.y=1-E.y-b.y,g.addBind(new Cu({material:A,scale:b,offset:E}));return}const y=Lx[x];if(y){g.addBind(new wu({material:A,type:y,targetValue:new Ne().fromArray(p.targetValue),targetAlpha:p.targetValue[3]}));return}console.warn(x+" is not supported")})}),o.registerExpression(g)}))),o})}};yd.v0v1PresetNameMap={a:"aa",e:"ee",i:"ih",o:"oh",u:"ou",blink:"blink",joy:"happy",angry:"angry",sorrow:"sad",fun:"relaxed",lookup:"lookUp",lookdown:"lookDown",lookleft:"lookLeft",lookright:"lookRight",blink_l:"blinkLeft",blink_r:"blinkRight",neutral:"neutral"};var Dx=yd,zl=class lr{constructor(e,t){this._firstPersonOnlyLayer=lr.DEFAULT_FIRSTPERSON_ONLY_LAYER,this._thirdPersonOnlyLayer=lr.DEFAULT_THIRDPERSON_ONLY_LAYER,this._initializedLayers=!1,this.humanoid=e,this.meshAnnotations=t}copy(e){if(this.humanoid!==e.humanoid)throw new Error("VRMFirstPerson: humanoid must be same in order to copy");return this.meshAnnotations=e.meshAnnotations.map(t=>({meshes:t.meshes.concat(),type:t.type})),this}clone(){return new lr(this.humanoid,this.meshAnnotations).copy(this)}get firstPersonOnlyLayer(){return this._firstPersonOnlyLayer}get thirdPersonOnlyLayer(){return this._thirdPersonOnlyLayer}setup({firstPersonOnlyLayer:e=lr.DEFAULT_FIRSTPERSON_ONLY_LAYER,thirdPersonOnlyLayer:t=lr.DEFAULT_THIRDPERSON_ONLY_LAYER}={}){this._initializedLayers||(this._firstPersonOnlyLayer=e,this._thirdPersonOnlyLayer=t,this.meshAnnotations.forEach(n=>{n.meshes.forEach(r=>{n.type==="firstPersonOnly"?(r.layers.set(this._firstPersonOnlyLayer),r.traverse(s=>s.layers.set(this._firstPersonOnlyLayer))):n.type==="thirdPersonOnly"?(r.layers.set(this._thirdPersonOnlyLayer),r.traverse(s=>s.layers.set(this._thirdPersonOnlyLayer))):n.type==="auto"&&this._createHeadlessModel(r)})}),this._initializedLayers=!0)}_excludeTriangles(e,t,n,r){let s=0;if(t!=null&&t.length>0)for(let o=0;o<e.length;o+=3){const a=e[o],l=e[o+1],c=e[o+2],u=t[a],h=n[a];if(u[0]>0&&r.includes(h[0])||u[1]>0&&r.includes(h[1])||u[2]>0&&r.includes(h[2])||u[3]>0&&r.includes(h[3]))continue;const d=t[l],f=n[l];if(d[0]>0&&r.includes(f[0])||d[1]>0&&r.includes(f[1])||d[2]>0&&r.includes(f[2])||d[3]>0&&r.includes(f[3]))continue;const g=t[c],v=n[c];g[0]>0&&r.includes(v[0])||g[1]>0&&r.includes(v[1])||g[2]>0&&r.includes(v[2])||g[3]>0&&r.includes(v[3])||(e[s++]=a,e[s++]=l,e[s++]=c)}return s}_createErasedMesh(e,t){const n=new zh(e.geometry.clone(),e.material);n.name=`${e.name}(erase)`,n.frustumCulled=e.frustumCulled,n.layers.set(this._firstPersonOnlyLayer);const r=n.geometry,s=r.getAttribute("skinIndex"),o=s instanceof Kc?[]:s.array,a=[];for(let v=0;v<o.length;v+=4)a.push([o[v],o[v+1],o[v+2],o[v+3]]);const l=r.getAttribute("skinWeight"),c=l instanceof Kc?[]:l.array,u=[];for(let v=0;v<c.length;v+=4)u.push([c[v],c[v+1],c[v+2],c[v+3]]);const h=r.getIndex();if(!h)throw new Error("The geometry doesn't have an index buffer");const d=Array.from(h.array),f=this._excludeTriangles(d,u,a,t),g=[];for(let v=0;v<f;v++)g[v]=d[v];return r.setIndex(g),e.onBeforeRender&&(n.onBeforeRender=e.onBeforeRender),n.bind(new yr(e.skeleton.bones,e.skeleton.boneInverses),new Ve),n}_createHeadlessModelForSkinnedMesh(e,t){const n=[];if(t.skeleton.bones.forEach((s,o)=>{this._isEraseTarget(s)&&n.push(o)}),!n.length){t.layers.enable(this._thirdPersonOnlyLayer),t.layers.enable(this._firstPersonOnlyLayer);return}t.layers.set(this._thirdPersonOnlyLayer);const r=this._createErasedMesh(t,n);e.add(r)}_createHeadlessModel(e){if(e.type==="Group")if(e.layers.set(this._thirdPersonOnlyLayer),this._isEraseTarget(e))e.traverse(t=>t.layers.set(this._thirdPersonOnlyLayer));else{const t=new $t;t.name=`_headless_${e.name}`,t.layers.set(this._firstPersonOnlyLayer),e.parent.add(t),e.children.filter(n=>n.type==="SkinnedMesh").forEach(n=>{const r=n;this._createHeadlessModelForSkinnedMesh(t,r)})}else if(e.type==="SkinnedMesh"){const t=e;this._createHeadlessModelForSkinnedMesh(e.parent,t)}else this._isEraseTarget(e)&&(e.layers.set(this._thirdPersonOnlyLayer),e.traverse(t=>t.layers.set(this._thirdPersonOnlyLayer)))}_isEraseTarget(e){return e===this.humanoid.getRawBoneNode("head")?!0:e.parent?this._isEraseTarget(e.parent):!1}};zl.DEFAULT_FIRSTPERSON_ONLY_LAYER=9;zl.DEFAULT_THIRDPERSON_ONLY_LAYER=10;var Pu=zl,Ux=new Set(["1.0","1.0-beta"]),Ox=class{get name(){return"VRMFirstPersonLoaderPlugin"}constructor(i){this.parser=i}afterRoot(i){return ct(this,null,function*(){const e=i.userData.vrmHumanoid;if(e!==null){if(e===void 0)throw new Error("VRMFirstPersonLoaderPlugin: vrmHumanoid is undefined. VRMHumanoidLoaderPlugin have to be used first");i.userData.vrmFirstPerson=yield this._import(i,e)}})}_import(i,e){return ct(this,null,function*(){if(e==null)return null;const t=yield this._v1Import(i,e);if(t)return t;const n=yield this._v0Import(i,e);return n||null})}_v1Import(i,e){return ct(this,null,function*(){var t,n;const r=this.parser.json;if(!(((t=r.extensionsUsed)==null?void 0:t.indexOf("VRMC_vrm"))!==-1))return null;const o=(n=r.extensions)==null?void 0:n.VRMC_vrm;if(!o)return null;const a=o.specVersion;if(!Ux.has(a))return console.warn(`VRMFirstPersonLoaderPlugin: Unknown VRMC_vrm specVersion "${a}"`),null;const l=o.firstPerson,c=[],u=yield bu(i);return Array.from(u.entries()).forEach(([h,d])=>{var f,g;const v=(f=l?.meshAnnotations)==null?void 0:f.find(p=>p.node===h);c.push({meshes:d,type:(g=v?.type)!=null?g:"auto"})}),new Pu(e,c)})}_v0Import(i,e){return ct(this,null,function*(){var t;const n=this.parser.json,r=(t=n.extensions)==null?void 0:t.VRM;if(!r)return null;const s=r.firstPerson;if(!s)return null;const o=[],a=yield bu(i);return Array.from(a.entries()).forEach(([l,c])=>{const u=n.nodes[l],h=s.meshAnnotations?s.meshAnnotations.find(d=>d.mesh===u.mesh):void 0;o.push({meshes:c,type:this._convertV0FlagToV1Type(h?.firstPersonFlag)})}),new Pu(e,o)})}_convertV0FlagToV1Type(i){return i==="FirstPersonOnly"?"firstPersonOnly":i==="ThirdPersonOnly"?"thirdPersonOnly":i==="Both"?"both":"auto"}},Lu=new C,Iu=new C,Fx=new Fe,Nu=class extends $t{constructor(i){super(),this.vrmHumanoid=i,this._boneAxesMap=new Map,Object.values(i.humanBones).forEach(e=>{const t=new ep(1);t.matrixAutoUpdate=!1,t.material.depthTest=!1,t.material.depthWrite=!1,this.add(t),this._boneAxesMap.set(e,t)})}dispose(){Array.from(this._boneAxesMap.values()).forEach(i=>{i.geometry.dispose(),i.material.dispose()})}updateMatrixWorld(i){Array.from(this._boneAxesMap.entries()).forEach(([e,t])=>{e.node.updateWorldMatrix(!0,!1),e.node.matrixWorld.decompose(Lu,Fx,Iu);const n=Lu.set(.1,.1,.1).divide(Iu);t.matrix.copy(e.node.matrixWorld).scale(n)}),super.updateMatrixWorld(i)}},ua=["hips","spine","chest","upperChest","neck","head","leftEye","rightEye","jaw","leftUpperLeg","leftLowerLeg","leftFoot","leftToes","rightUpperLeg","rightLowerLeg","rightFoot","rightToes","leftShoulder","leftUpperArm","leftLowerArm","leftHand","rightShoulder","rightUpperArm","rightLowerArm","rightHand","leftThumbMetacarpal","leftThumbProximal","leftThumbDistal","leftIndexProximal","leftIndexIntermediate","leftIndexDistal","leftMiddleProximal","leftMiddleIntermediate","leftMiddleDistal","leftRingProximal","leftRingIntermediate","leftRingDistal","leftLittleProximal","leftLittleIntermediate","leftLittleDistal","rightThumbMetacarpal","rightThumbProximal","rightThumbDistal","rightIndexProximal","rightIndexIntermediate","rightIndexDistal","rightMiddleProximal","rightMiddleIntermediate","rightMiddleDistal","rightRingProximal","rightRingIntermediate","rightRingDistal","rightLittleProximal","rightLittleIntermediate","rightLittleDistal"],Bx={hips:null,spine:"hips",chest:"spine",upperChest:"chest",neck:"upperChest",head:"neck",leftEye:"head",rightEye:"head",jaw:"head",leftUpperLeg:"hips",leftLowerLeg:"leftUpperLeg",leftFoot:"leftLowerLeg",leftToes:"leftFoot",rightUpperLeg:"hips",rightLowerLeg:"rightUpperLeg",rightFoot:"rightLowerLeg",rightToes:"rightFoot",leftShoulder:"upperChest",leftUpperArm:"leftShoulder",leftLowerArm:"leftUpperArm",leftHand:"leftLowerArm",rightShoulder:"upperChest",rightUpperArm:"rightShoulder",rightLowerArm:"rightUpperArm",rightHand:"rightLowerArm",leftThumbMetacarpal:"leftHand",leftThumbProximal:"leftThumbMetacarpal",leftThumbDistal:"leftThumbProximal",leftIndexProximal:"leftHand",leftIndexIntermediate:"leftIndexProximal",leftIndexDistal:"leftIndexIntermediate",leftMiddleProximal:"leftHand",leftMiddleIntermediate:"leftMiddleProximal",leftMiddleDistal:"leftMiddleIntermediate",leftRingProximal:"leftHand",leftRingIntermediate:"leftRingProximal",leftRingDistal:"leftRingIntermediate",leftLittleProximal:"leftHand",leftLittleIntermediate:"leftLittleProximal",leftLittleDistal:"leftLittleIntermediate",rightThumbMetacarpal:"rightHand",rightThumbProximal:"rightThumbMetacarpal",rightThumbDistal:"rightThumbProximal",rightIndexProximal:"rightHand",rightIndexIntermediate:"rightIndexProximal",rightIndexDistal:"rightIndexIntermediate",rightMiddleProximal:"rightHand",rightMiddleIntermediate:"rightMiddleProximal",rightMiddleDistal:"rightMiddleIntermediate",rightRingProximal:"rightHand",rightRingIntermediate:"rightRingProximal",rightRingDistal:"rightRingIntermediate",rightLittleProximal:"rightHand",rightLittleIntermediate:"rightLittleProximal",rightLittleDistal:"rightLittleIntermediate"};function Ed(i){return i.invert?i.invert():i.inverse(),i}var Pi=new C,Li=new Fe,ml=class{constructor(i){this.humanBones=i,this.restPose=this.getAbsolutePose()}getAbsolutePose(){const i={};return Object.keys(this.humanBones).forEach(e=>{const t=e,n=this.getBoneNode(t);n&&(Pi.copy(n.position),Li.copy(n.quaternion),i[t]={position:Pi.toArray(),rotation:Li.toArray()})}),i}getPose(){const i={};return Object.keys(this.humanBones).forEach(e=>{const t=e,n=this.getBoneNode(t);if(!n)return;Pi.set(0,0,0),Li.identity();const r=this.restPose[t];r?.position&&Pi.fromArray(r.position).negate(),r?.rotation&&Ed(Li.fromArray(r.rotation)),Pi.add(n.position),Li.premultiply(n.quaternion),i[t]={position:Pi.toArray(),rotation:Li.toArray()}}),i}setPose(i){Object.entries(i).forEach(([e,t])=>{const n=e,r=this.getBoneNode(n);if(!r)return;const s=this.restPose[n];s&&(t?.position&&(r.position.fromArray(t.position),s.position&&r.position.add(Pi.fromArray(s.position))),t?.rotation&&(r.quaternion.fromArray(t.rotation),s.rotation&&r.quaternion.multiply(Li.fromArray(s.rotation))))})}resetPose(){Object.entries(this.restPose).forEach(([i,e])=>{const t=this.getBoneNode(i);t&&(e?.position&&t.position.fromArray(e.position),e?.rotation&&t.quaternion.fromArray(e.rotation))})}getBone(i){var e;return(e=this.humanBones[i])!=null?e:void 0}getBoneNode(i){var e,t;return(t=(e=this.humanBones[i])==null?void 0:e.node)!=null?t:null}},ha=new C,kx=new Fe,Vx=new C,Du=class bd extends ml{static _setupTransforms(e){const t=new ft;t.name="VRMHumanoidRig";const n={},r={},s={};ua.forEach(a=>{var l;const c=e.getBoneNode(a);if(c){const u=new C,h=new Fe;c.updateWorldMatrix(!0,!1),c.matrixWorld.decompose(u,h,ha),n[a]=u,r[a]=c.quaternion.clone();const d=new Fe;(l=c.parent)==null||l.matrixWorld.decompose(ha,d,ha),s[a]=d}});const o={};return ua.forEach(a=>{var l;const c=e.getBoneNode(a);if(c){const u=n[a];let h=a,d;for(;d==null&&(h=Bx[h],h!=null);)d=n[h];const f=new ft;f.name="Normalized_"+c.name,(h?(l=o[h])==null?void 0:l.node:t).add(f),f.position.copy(u),d&&f.position.sub(d),o[a]={node:f}}}),{rigBones:o,root:t,parentWorldRotations:s,boneRotations:r}}constructor(e){const{rigBones:t,root:n,parentWorldRotations:r,boneRotations:s}=bd._setupTransforms(e);super(t),this.original=e,this.root=n,this._parentWorldRotations=r,this._boneRotations=s}update(){ua.forEach(e=>{const t=this.original.getBoneNode(e);if(t!=null){const n=this.getBoneNode(e),r=this._parentWorldRotations[e],s=kx.copy(r).invert(),o=this._boneRotations[e];if(t.quaternion.copy(n.quaternion).multiply(r).premultiply(s).multiply(o),e==="hips"){const a=n.getWorldPosition(Vx);t.parent.updateWorldMatrix(!0,!1);const l=t.parent.matrixWorld,c=a.applyMatrix4(l.invert());t.position.copy(c)}}})}},Uu=class Ad{get restPose(){return console.warn("VRMHumanoid: restPose is deprecated. Use either rawRestPose or normalizedRestPose instead."),this.rawRestPose}get rawRestPose(){return this._rawHumanBones.restPose}get normalizedRestPose(){return this._normalizedHumanBones.restPose}get humanBones(){return this._rawHumanBones.humanBones}get rawHumanBones(){return this._rawHumanBones.humanBones}get normalizedHumanBones(){return this._normalizedHumanBones.humanBones}get normalizedHumanBonesRoot(){return this._normalizedHumanBones.root}constructor(e,t){var n;this.autoUpdateHumanBones=(n=t?.autoUpdateHumanBones)!=null?n:!0,this._rawHumanBones=new ml(e),this._normalizedHumanBones=new Du(this._rawHumanBones)}copy(e){return this.autoUpdateHumanBones=e.autoUpdateHumanBones,this._rawHumanBones=new ml(e.humanBones),this._normalizedHumanBones=new Du(this._rawHumanBones),this}clone(){return new Ad(this.humanBones,{autoUpdateHumanBones:this.autoUpdateHumanBones}).copy(this)}getAbsolutePose(){return console.warn("VRMHumanoid: getAbsolutePose() is deprecated. Use either getRawAbsolutePose() or getNormalizedAbsolutePose() instead."),this.getRawAbsolutePose()}getRawAbsolutePose(){return this._rawHumanBones.getAbsolutePose()}getNormalizedAbsolutePose(){return this._normalizedHumanBones.getAbsolutePose()}getPose(){return console.warn("VRMHumanoid: getPose() is deprecated. Use either getRawPose() or getNormalizedPose() instead."),this.getRawPose()}getRawPose(){return this._rawHumanBones.getPose()}getNormalizedPose(){return this._normalizedHumanBones.getPose()}setPose(e){return console.warn("VRMHumanoid: setPose() is deprecated. Use either setRawPose() or setNormalizedPose() instead."),this.setRawPose(e)}setRawPose(e){return this._rawHumanBones.setPose(e)}setNormalizedPose(e){return this._normalizedHumanBones.setPose(e)}resetPose(){return console.warn("VRMHumanoid: resetPose() is deprecated. Use either resetRawPose() or resetNormalizedPose() instead."),this.resetRawPose()}resetRawPose(){return this._rawHumanBones.resetPose()}resetNormalizedPose(){return this._normalizedHumanBones.resetPose()}getBone(e){return console.warn("VRMHumanoid: getBone() is deprecated. Use either getRawBone() or getNormalizedBone() instead."),this.getRawBone(e)}getRawBone(e){return this._rawHumanBones.getBone(e)}getNormalizedBone(e){return this._normalizedHumanBones.getBone(e)}getBoneNode(e){return console.warn("VRMHumanoid: getBoneNode() is deprecated. Use either getRawBoneNode() or getNormalizedBoneNode() instead."),this.getRawBoneNode(e)}getRawBoneNode(e){return this._rawHumanBones.getBoneNode(e)}getNormalizedBoneNode(e){return this._normalizedHumanBones.getBoneNode(e)}update(){this.autoUpdateHumanBones&&this._normalizedHumanBones.update()}},Hx={Hips:"hips",Spine:"spine",Head:"head",LeftUpperLeg:"leftUpperLeg",LeftLowerLeg:"leftLowerLeg",LeftFoot:"leftFoot",RightUpperLeg:"rightUpperLeg",RightLowerLeg:"rightLowerLeg",RightFoot:"rightFoot",LeftUpperArm:"leftUpperArm",LeftLowerArm:"leftLowerArm",LeftHand:"leftHand",RightUpperArm:"rightUpperArm",RightLowerArm:"rightLowerArm",RightHand:"rightHand"},zx=new Set(["1.0","1.0-beta"]),Ou={leftThumbProximal:"leftThumbMetacarpal",leftThumbIntermediate:"leftThumbProximal",rightThumbProximal:"rightThumbMetacarpal",rightThumbIntermediate:"rightThumbProximal"},Gx=class{get name(){return"VRMHumanoidLoaderPlugin"}constructor(i,e){this.parser=i,this.helperRoot=e?.helperRoot,this.autoUpdateHumanBones=e?.autoUpdateHumanBones}afterRoot(i){return ct(this,null,function*(){i.userData.vrmHumanoid=yield this._import(i)})}_import(i){return ct(this,null,function*(){const e=yield this._v1Import(i);if(e)return e;const t=yield this._v0Import(i);return t||null})}_v1Import(i){return ct(this,null,function*(){var e,t;const n=this.parser.json;if(!(((e=n.extensionsUsed)==null?void 0:e.indexOf("VRMC_vrm"))!==-1))return null;const s=(t=n.extensions)==null?void 0:t.VRMC_vrm;if(!s)return null;const o=s.specVersion;if(!zx.has(o))return console.warn(`VRMHumanoidLoaderPlugin: Unknown VRMC_vrm specVersion "${o}"`),null;const a=s.humanoid;if(!a)return null;const l=a.humanBones.leftThumbIntermediate!=null||a.humanBones.rightThumbIntermediate!=null,c={};a.humanBones!=null&&(yield Promise.all(Object.entries(a.humanBones).map(h=>ct(this,[h],function*([d,f]){let g=d;const v=f.node;if(l){const m=Ou[g];m!=null&&(g=m)}const p=yield this.parser.getDependency("node",v);if(p==null){console.warn(`A glTF node bound to the humanoid bone ${g} (index = ${v}) does not exist`);return}c[g]={node:p}}))));const u=new Uu(this._ensureRequiredBonesExist(c),{autoUpdateHumanBones:this.autoUpdateHumanBones});if(i.scene.add(u.normalizedHumanBonesRoot),this.helperRoot){const h=new Nu(u);this.helperRoot.add(h),h.renderOrder=this.helperRoot.renderOrder}return u})}_v0Import(i){return ct(this,null,function*(){var e;const n=(e=this.parser.json.extensions)==null?void 0:e.VRM;if(!n)return null;const r=n.humanoid;if(!r)return null;const s={};r.humanBones!=null&&(yield Promise.all(r.humanBones.map(a=>ct(this,null,function*(){const l=a.bone,c=a.node;if(l==null||c==null)return;if(c<0){console.warn(`A glTF node index for the humanoid bone ${l} is negative (${c}), ignoring this bone.`);return}const u=yield this.parser.getDependency("node",c);if(u==null){console.warn(`A glTF node bound to the humanoid bone ${l} (index = ${c}) does not exist`);return}const h=Ou[l],d=h??l;if(s[d]!=null){console.warn(`Multiple bone entries for ${d} detected (index = ${c}), ignoring duplicated entries.`);return}s[d]={node:u}}))));const o=new Uu(this._ensureRequiredBonesExist(s),{autoUpdateHumanBones:this.autoUpdateHumanBones});if(i.scene.add(o.normalizedHumanBonesRoot),this.helperRoot){const a=new Nu(o);this.helperRoot.add(a),a.renderOrder=this.helperRoot.renderOrder}return o})}_ensureRequiredBonesExist(i){const e=Object.values(Hx).filter(t=>i[t]==null);if(e.length>0)throw new Error(`VRMHumanoidLoaderPlugin: These humanoid bones are required but not exist: ${e.join(", ")}`);return i}},Fu=class extends Et{constructor(){super(),this._currentTheta=0,this._currentRadius=0,this.theta=0,this.radius=0,this._currentTheta=0,this._currentRadius=0,this._attrPos=new vt(new Float32Array(195),3),this.setAttribute("position",this._attrPos),this._attrIndex=new vt(new Uint16Array(189),1),this.setIndex(this._attrIndex),this._buildIndex(),this.update()}update(){let i=!1;this._currentTheta!==this.theta&&(this._currentTheta=this.theta,i=!0),this._currentRadius!==this.radius&&(this._currentRadius=this.radius,i=!0),i&&this._buildPosition()}_buildPosition(){this._attrPos.setXYZ(0,0,0,0);for(let i=0;i<64;i++){const e=i/63*this._currentTheta;this._attrPos.setXYZ(i+1,this._currentRadius*Math.sin(e),0,this._currentRadius*Math.cos(e))}this._attrPos.needsUpdate=!0}_buildIndex(){for(let i=0;i<63;i++)this._attrIndex.setXYZ(i*3,0,i+1,i+2);this._attrIndex.needsUpdate=!0}},Wx=class extends Et{constructor(){super(),this.radius=0,this._currentRadius=0,this.tail=new C,this._currentTail=new C,this._attrPos=new vt(new Float32Array(294),3),this.setAttribute("position",this._attrPos),this._attrIndex=new vt(new Uint16Array(194),1),this.setIndex(this._attrIndex),this._buildIndex(),this.update()}update(){let i=!1;this._currentRadius!==this.radius&&(this._currentRadius=this.radius,i=!0),this._currentTail.equals(this.tail)||(this._currentTail.copy(this.tail),i=!0),i&&this._buildPosition()}_buildPosition(){for(let i=0;i<32;i++){const e=i/16*Math.PI;this._attrPos.setXYZ(i,Math.cos(e),Math.sin(e),0),this._attrPos.setXYZ(32+i,0,Math.cos(e),Math.sin(e)),this._attrPos.setXYZ(64+i,Math.sin(e),0,Math.cos(e))}this.scale(this._currentRadius,this._currentRadius,this._currentRadius),this.translate(this._currentTail.x,this._currentTail.y,this._currentTail.z),this._attrPos.setXYZ(96,0,0,0),this._attrPos.setXYZ(97,this._currentTail.x,this._currentTail.y,this._currentTail.z),this._attrPos.needsUpdate=!0}_buildIndex(){for(let i=0;i<32;i++){const e=(i+1)%32;this._attrIndex.setXY(i*2,i,e),this._attrIndex.setXY(64+i*2,32+i,32+e),this._attrIndex.setXY(128+i*2,64+i,64+e)}this._attrIndex.setXY(192,96,97),this._attrIndex.needsUpdate=!0}},$s=new Fe,Bu=new Fe,zr=new C,ku=new C,Vu=Math.sqrt(2)/2,Xx=new Fe(0,0,-Vu,Vu),qx=new C(0,1,0),Yx=class extends $t{constructor(i){super(),this.matrixAutoUpdate=!1,this.vrmLookAt=i;{const e=new Fu;e.radius=.5;const t=new Un({color:65280,transparent:!0,opacity:.5,side:jt,depthTest:!1,depthWrite:!1});this._meshPitch=new wt(e,t),this.add(this._meshPitch)}{const e=new Fu;e.radius=.5;const t=new Un({color:16711680,transparent:!0,opacity:.5,side:jt,depthTest:!1,depthWrite:!1});this._meshYaw=new wt(e,t),this.add(this._meshYaw)}{const e=new Wx;e.radius=.1;const t=new Bi({color:16777215,depthTest:!1,depthWrite:!1});this._lineTarget=new gs(e,t),this._lineTarget.frustumCulled=!1,this.add(this._lineTarget)}}dispose(){this._meshYaw.geometry.dispose(),this._meshYaw.material.dispose(),this._meshPitch.geometry.dispose(),this._meshPitch.material.dispose(),this._lineTarget.geometry.dispose(),this._lineTarget.material.dispose()}updateMatrixWorld(i){const e=ut.DEG2RAD*this.vrmLookAt.yaw;this._meshYaw.geometry.theta=e,this._meshYaw.geometry.update();const t=ut.DEG2RAD*this.vrmLookAt.pitch;this._meshPitch.geometry.theta=t,this._meshPitch.geometry.update(),this.vrmLookAt.getLookAtWorldPosition(zr),this.vrmLookAt.getLookAtWorldQuaternion($s),$s.multiply(this.vrmLookAt.getFaceFrontQuaternion(Bu)),this._meshYaw.position.copy(zr),this._meshYaw.quaternion.copy($s),this._meshPitch.position.copy(zr),this._meshPitch.quaternion.copy($s),this._meshPitch.quaternion.multiply(Bu.setFromAxisAngle(qx,e)),this._meshPitch.quaternion.multiply(Xx);const{target:n,autoUpdate:r}=this.vrmLookAt;n!=null&&r&&(n.getWorldPosition(ku).sub(zr),this._lineTarget.geometry.tail.copy(ku),this._lineTarget.geometry.update(),this._lineTarget.position.copy(zr)),super.updateMatrixWorld(i)}},Kx=new C,$x=new C;function gl(i,e){return i.matrixWorld.decompose(Kx,e,$x),e}function ro(i){return[Math.atan2(-i.z,i.x),Math.atan2(i.y,Math.sqrt(i.x*i.x+i.z*i.z))]}function Hu(i){const e=Math.round(i/2/Math.PI);return i-2*Math.PI*e}var zu=new C(0,0,1),Zx=new C,Jx=new C,Qx=new C,jx=new Fe,da=new Fe,Gu=new Fe,eM=new Fe,fa=new yn,wd=class Rd{constructor(e,t){this.offsetFromHeadBone=new C,this.autoUpdate=!0,this.faceFront=new C(0,0,1),this.humanoid=e,this.applier=t,this._yaw=0,this._pitch=0,this._needsUpdate=!0,this._restHeadWorldQuaternion=this.getLookAtWorldQuaternion(new Fe)}get yaw(){return this._yaw}set yaw(e){this._yaw=e,this._needsUpdate=!0}get pitch(){return this._pitch}set pitch(e){this._pitch=e,this._needsUpdate=!0}get euler(){return console.warn("VRMLookAt: euler is deprecated. use getEuler() instead."),this.getEuler(new yn)}getEuler(e){return e.set(ut.DEG2RAD*this._pitch,ut.DEG2RAD*this._yaw,0,"YXZ")}copy(e){if(this.humanoid!==e.humanoid)throw new Error("VRMLookAt: humanoid must be same in order to copy");return this.offsetFromHeadBone.copy(e.offsetFromHeadBone),this.applier=e.applier,this.autoUpdate=e.autoUpdate,this.target=e.target,this.faceFront.copy(e.faceFront),this}clone(){return new Rd(this.humanoid,this.applier).copy(this)}reset(){this._yaw=0,this._pitch=0,this._needsUpdate=!0}getLookAtWorldPosition(e){const t=this.humanoid.getRawBoneNode("head");return e.copy(this.offsetFromHeadBone).applyMatrix4(t.matrixWorld)}getLookAtWorldQuaternion(e){const t=this.humanoid.getRawBoneNode("head");return gl(t,e)}getFaceFrontQuaternion(e){if(this.faceFront.distanceToSquared(zu)<.01)return e.copy(this._restHeadWorldQuaternion).invert();const[t,n]=ro(this.faceFront);return fa.set(0,.5*Math.PI+t,n,"YZX"),e.setFromEuler(fa).premultiply(eM.copy(this._restHeadWorldQuaternion).invert())}getLookAtWorldDirection(e){return this.getLookAtWorldQuaternion(da),this.getFaceFrontQuaternion(Gu),e.copy(zu).applyQuaternion(da).applyQuaternion(Gu).applyEuler(this.getEuler(fa))}lookAt(e){const t=jx.copy(this._restHeadWorldQuaternion).multiply(Ed(this.getLookAtWorldQuaternion(da))),n=this.getLookAtWorldPosition(Jx),r=Qx.copy(e).sub(n).applyQuaternion(t).normalize(),[s,o]=ro(this.faceFront),[a,l]=ro(r),c=Hu(a-s),u=Hu(o-l);this._yaw=ut.RAD2DEG*c,this._pitch=ut.RAD2DEG*u,this._needsUpdate=!0}update(e){this.target!=null&&this.autoUpdate&&this.lookAt(this.target.getWorldPosition(Zx)),this._needsUpdate&&(this._needsUpdate=!1,this.applier.applyYawPitch(this._yaw,this._pitch))}};wd.EULER_ORDER="YXZ";var tM=wd,nM=new C(0,0,1),Cn=new Fe,ir=new Fe,sn=new yn(0,0,0,"YXZ"),so=class{constructor(i,e,t,n,r){this.humanoid=i,this.rangeMapHorizontalInner=e,this.rangeMapHorizontalOuter=t,this.rangeMapVerticalDown=n,this.rangeMapVerticalUp=r,this.faceFront=new C(0,0,1),this._restQuatLeftEye=new Fe,this._restQuatRightEye=new Fe,this._restLeftEyeParentWorldQuat=new Fe,this._restRightEyeParentWorldQuat=new Fe;const s=this.humanoid.getRawBoneNode("leftEye"),o=this.humanoid.getRawBoneNode("rightEye");s&&(this._restQuatLeftEye.copy(s.quaternion),gl(s.parent,this._restLeftEyeParentWorldQuat)),o&&(this._restQuatRightEye.copy(o.quaternion),gl(o.parent,this._restRightEyeParentWorldQuat))}applyYawPitch(i,e){const t=this.humanoid.getRawBoneNode("leftEye"),n=this.humanoid.getRawBoneNode("rightEye"),r=this.humanoid.getNormalizedBoneNode("leftEye"),s=this.humanoid.getNormalizedBoneNode("rightEye");t&&(e<0?sn.x=-ut.DEG2RAD*this.rangeMapVerticalDown.map(-e):sn.x=ut.DEG2RAD*this.rangeMapVerticalUp.map(e),i<0?sn.y=-ut.DEG2RAD*this.rangeMapHorizontalInner.map(-i):sn.y=ut.DEG2RAD*this.rangeMapHorizontalOuter.map(i),Cn.setFromEuler(sn),this._getWorldFaceFrontQuat(ir),r.quaternion.copy(ir).multiply(Cn).multiply(ir.invert()),Cn.copy(this._restLeftEyeParentWorldQuat),t.quaternion.copy(r.quaternion).multiply(Cn).premultiply(Cn.invert()).multiply(this._restQuatLeftEye)),n&&(e<0?sn.x=-ut.DEG2RAD*this.rangeMapVerticalDown.map(-e):sn.x=ut.DEG2RAD*this.rangeMapVerticalUp.map(e),i<0?sn.y=-ut.DEG2RAD*this.rangeMapHorizontalOuter.map(-i):sn.y=ut.DEG2RAD*this.rangeMapHorizontalInner.map(i),Cn.setFromEuler(sn),this._getWorldFaceFrontQuat(ir),s.quaternion.copy(ir).multiply(Cn).multiply(ir.invert()),Cn.copy(this._restRightEyeParentWorldQuat),n.quaternion.copy(s.quaternion).multiply(Cn).premultiply(Cn.invert()).multiply(this._restQuatRightEye))}lookAt(i){console.warn("VRMLookAtBoneApplier: lookAt() is deprecated. use apply() instead.");const e=ut.RAD2DEG*i.y,t=ut.RAD2DEG*i.x;this.applyYawPitch(e,t)}_getWorldFaceFrontQuat(i){if(this.faceFront.distanceToSquared(nM)<.01)return i.identity();const[e,t]=ro(this.faceFront);return sn.set(0,.5*Math.PI+e,t,"YZX"),i.setFromEuler(sn)}};so.type="bone";var _l=class{constructor(i,e,t,n,r){this.expressions=i,this.rangeMapHorizontalInner=e,this.rangeMapHorizontalOuter=t,this.rangeMapVerticalDown=n,this.rangeMapVerticalUp=r}applyYawPitch(i,e){e<0?(this.expressions.setValue("lookDown",0),this.expressions.setValue("lookUp",this.rangeMapVerticalUp.map(-e))):(this.expressions.setValue("lookUp",0),this.expressions.setValue("lookDown",this.rangeMapVerticalDown.map(e))),i<0?(this.expressions.setValue("lookLeft",0),this.expressions.setValue("lookRight",this.rangeMapHorizontalOuter.map(-i))):(this.expressions.setValue("lookRight",0),this.expressions.setValue("lookLeft",this.rangeMapHorizontalOuter.map(i)))}lookAt(i){console.warn("VRMLookAtBoneApplier: lookAt() is deprecated. use apply() instead.");const e=ut.RAD2DEG*i.y,t=ut.RAD2DEG*i.x;this.applyYawPitch(e,t)}};_l.type="expression";var Wu=class{constructor(i,e){this.inputMaxValue=i,this.outputScale=e}map(i){return this.outputScale*gd(i/this.inputMaxValue)}},iM=new Set(["1.0","1.0-beta"]),Zs=.01,rM=class{get name(){return"VRMLookAtLoaderPlugin"}constructor(i,e){this.parser=i,this.helperRoot=e?.helperRoot}afterRoot(i){return ct(this,null,function*(){const e=i.userData.vrmHumanoid;if(e===null)return;if(e===void 0)throw new Error("VRMLookAtLoaderPlugin: vrmHumanoid is undefined. VRMHumanoidLoaderPlugin have to be used first");const t=i.userData.vrmExpressionManager;if(t!==null){if(t===void 0)throw new Error("VRMLookAtLoaderPlugin: vrmExpressionManager is undefined. VRMExpressionLoaderPlugin have to be used first");i.userData.vrmLookAt=yield this._import(i,e,t)}})}_import(i,e,t){return ct(this,null,function*(){if(e==null||t==null)return null;const n=yield this._v1Import(i,e,t);if(n)return n;const r=yield this._v0Import(i,e,t);return r||null})}_v1Import(i,e,t){return ct(this,null,function*(){var n,r,s;const o=this.parser.json;if(!(((n=o.extensionsUsed)==null?void 0:n.indexOf("VRMC_vrm"))!==-1))return null;const l=(r=o.extensions)==null?void 0:r.VRMC_vrm;if(!l)return null;const c=l.specVersion;if(!iM.has(c))return console.warn(`VRMLookAtLoaderPlugin: Unknown VRMC_vrm specVersion "${c}"`),null;const u=l.lookAt;if(!u)return null;const h=u.type==="expression"?1:10,d=this._v1ImportRangeMap(u.rangeMapHorizontalInner,h),f=this._v1ImportRangeMap(u.rangeMapHorizontalOuter,h),g=this._v1ImportRangeMap(u.rangeMapVerticalDown,h),v=this._v1ImportRangeMap(u.rangeMapVerticalUp,h);let p;u.type==="expression"?p=new _l(t,d,f,g,v):p=new so(e,d,f,g,v);const m=this._importLookAt(e,p);return m.offsetFromHeadBone.fromArray((s=u.offsetFromHeadBone)!=null?s:[0,.06,0]),m})}_v1ImportRangeMap(i,e){var t,n;let r=(t=i?.inputMaxValue)!=null?t:90;const s=(n=i?.outputScale)!=null?n:e;return r<Zs&&(console.warn("VRMLookAtLoaderPlugin: inputMaxValue of a range map is too small. Consider reviewing the range map!"),r=Zs),new Wu(r,s)}_v0Import(i,e,t){return ct(this,null,function*(){var n,r,s,o;const l=(n=this.parser.json.extensions)==null?void 0:n.VRM;if(!l)return null;const c=l.firstPerson;if(!c)return null;const u=c.lookAtTypeName==="BlendShape"?1:10,h=this._v0ImportDegreeMap(c.lookAtHorizontalInner,u),d=this._v0ImportDegreeMap(c.lookAtHorizontalOuter,u),f=this._v0ImportDegreeMap(c.lookAtVerticalDown,u),g=this._v0ImportDegreeMap(c.lookAtVerticalUp,u);let v;c.lookAtTypeName==="BlendShape"?v=new _l(t,h,d,f,g):v=new so(e,h,d,f,g);const p=this._importLookAt(e,v);return c.firstPersonBoneOffset?p.offsetFromHeadBone.set((r=c.firstPersonBoneOffset.x)!=null?r:0,(s=c.firstPersonBoneOffset.y)!=null?s:.06,-((o=c.firstPersonBoneOffset.z)!=null?o:0)):p.offsetFromHeadBone.set(0,.06,0),p.faceFront.set(0,0,-1),v instanceof so&&v.faceFront.set(0,0,-1),p})}_v0ImportDegreeMap(i,e){var t,n;const r=i?.curve;JSON.stringify(r)!=="[0,0,0,1,1,1,1,0]"&&console.warn("Curves of LookAtDegreeMap defined in VRM 0.0 are not supported");let s=(t=i?.xRange)!=null?t:90;const o=(n=i?.yRange)!=null?n:e;return s<Zs&&(console.warn("VRMLookAtLoaderPlugin: xRange of a degree map is too small. Consider reviewing the degree map!"),s=Zs),new Wu(s,o)}_importLookAt(i,e){const t=new tM(i,e);if(this.helperRoot){const n=new Yx(t);this.helperRoot.add(n),n.renderOrder=this.helperRoot.renderOrder}return t}};function sM(i,e){return typeof i!="string"||i===""?"":(/^https?:\/\//i.test(e)&&/^\//.test(i)&&(e=e.replace(/(^https?:\/\/[^/]+).*/i,"$1")),/^(https?:)?\/\//i.test(i)||/^data:.*,.*$/i.test(i)||/^blob:.*$/i.test(i)?i:e+i)}var oM=new Set(["1.0","1.0-beta"]),aM=class{get name(){return"VRMMetaLoaderPlugin"}constructor(i,e){var t,n,r;this.parser=i,this.needThumbnailImage=(t=e?.needThumbnailImage)!=null?t:!1,this.acceptLicenseUrls=(n=e?.acceptLicenseUrls)!=null?n:["https://vrm.dev/licenses/1.0/"],this.acceptV0Meta=(r=e?.acceptV0Meta)!=null?r:!0}afterRoot(i){return ct(this,null,function*(){i.userData.vrmMeta=yield this._import(i)})}_import(i){return ct(this,null,function*(){const e=yield this._v1Import(i);if(e!=null)return e;const t=yield this._v0Import(i);return t??null})}_v1Import(i){return ct(this,null,function*(){var e,t,n;const r=this.parser.json;if(!(((e=r.extensionsUsed)==null?void 0:e.indexOf("VRMC_vrm"))!==-1))return null;const o=(t=r.extensions)==null?void 0:t.VRMC_vrm;if(o==null)return null;const a=o.specVersion;if(!oM.has(a))return console.warn(`VRMMetaLoaderPlugin: Unknown VRMC_vrm specVersion "${a}"`),null;const l=o.meta;if(!l)return null;const c=l.licenseUrl;if(!new Set(this.acceptLicenseUrls).has(c))throw new Error(`VRMMetaLoaderPlugin: The license url "${c}" is not accepted`);let h;return this.needThumbnailImage&&l.thumbnailImage!=null&&(h=(n=yield this._extractGLTFImage(l.thumbnailImage))!=null?n:void 0),{metaVersion:"1",name:l.name,version:l.version,authors:l.authors,copyrightInformation:l.copyrightInformation,contactInformation:l.contactInformation,references:l.references,thirdPartyLicenses:l.thirdPartyLicenses,thumbnailImage:h,licenseUrl:l.licenseUrl,avatarPermission:l.avatarPermission,allowExcessivelyViolentUsage:l.allowExcessivelyViolentUsage,allowExcessivelySexualUsage:l.allowExcessivelySexualUsage,commercialUsage:l.commercialUsage,allowPoliticalOrReligiousUsage:l.allowPoliticalOrReligiousUsage,allowAntisocialOrHateUsage:l.allowAntisocialOrHateUsage,creditNotation:l.creditNotation,allowRedistribution:l.allowRedistribution,modification:l.modification,otherLicenseUrl:l.otherLicenseUrl}})}_v0Import(i){return ct(this,null,function*(){var e;const n=(e=this.parser.json.extensions)==null?void 0:e.VRM;if(!n)return null;const r=n.meta;if(!r)return null;if(!this.acceptV0Meta)throw new Error("VRMMetaLoaderPlugin: Attempted to load VRM0.0 meta but acceptV0Meta is false");let s;return this.needThumbnailImage&&r.texture!=null&&r.texture!==-1&&(s=yield this.parser.getDependency("texture",r.texture)),{metaVersion:"0",allowedUserName:r.allowedUserName,author:r.author,commercialUssageName:r.commercialUssageName,contactInformation:r.contactInformation,licenseName:r.licenseName,otherLicenseUrl:r.otherLicenseUrl,otherPermissionUrl:r.otherPermissionUrl,reference:r.reference,sexualUssageName:r.sexualUssageName,texture:s??void 0,title:r.title,version:r.version,violentUssageName:r.violentUssageName}})}_extractGLTFImage(i){return ct(this,null,function*(){var e;const n=(e=this.parser.json.images)==null?void 0:e[i];if(n==null)return console.warn(`VRMMetaLoaderPlugin: Attempt to use images[${i}] of glTF as a thumbnail but the image doesn't exist`),null;let r=n.uri;if(n.bufferView!=null){const o=yield this.parser.getDependency("bufferView",n.bufferView),a=new Blob([o],{type:n.mimeType});r=URL.createObjectURL(a)}return r==null?(console.warn(`VRMMetaLoaderPlugin: Attempt to use images[${i}] of glTF as a thumbnail but the image couldn't load properly`),null):yield new jh().loadAsync(sM(r,this.parser.options.path)).catch(o=>(console.error(o),console.warn("VRMMetaLoaderPlugin: Failed to load a thumbnail image"),null))})}},lM=class{constructor(i){this.scene=i.scene,this.meta=i.meta,this.humanoid=i.humanoid,this.expressionManager=i.expressionManager,this.firstPerson=i.firstPerson,this.lookAt=i.lookAt}update(i){this.humanoid.update(),this.lookAt&&this.lookAt.update(i),this.expressionManager&&this.expressionManager.update()}},cM=class extends lM{constructor(i){super(i),this.materials=i.materials,this.springBoneManager=i.springBoneManager,this.nodeConstraintManager=i.nodeConstraintManager}update(i){super.update(i),this.nodeConstraintManager&&this.nodeConstraintManager.update(),this.springBoneManager&&this.springBoneManager.update(i),this.materials&&this.materials.forEach(e=>{e.update&&e.update(i)})}},uM=Object.defineProperty,Xu=Object.getOwnPropertySymbols,hM=Object.prototype.hasOwnProperty,dM=Object.prototype.propertyIsEnumerable,qu=(i,e,t)=>e in i?uM(i,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):i[e]=t,Yu=(i,e)=>{for(var t in e||(e={}))hM.call(e,t)&&qu(i,t,e[t]);if(Xu)for(var t of Xu(e))dM.call(e,t)&&qu(i,t,e[t]);return i},Di=(i,e,t)=>new Promise((n,r)=>{var s=l=>{try{a(t.next(l))}catch(c){r(c)}},o=l=>{try{a(t.throw(l))}catch(c){r(c)}},a=l=>l.done?n(l.value):Promise.resolve(l.value).then(s,o);a((t=t.apply(i,e)).next())}),fM={"":3e3,srgb:3001};function pM(i,e){parseInt(Ui,10)>=152?i.colorSpace=e:i.encoding=fM[e]}var mM=class{get pending(){return Promise.all(this._pendings)}constructor(i,e){this._parser=i,this._materialParams=e,this._pendings=[]}assignPrimitive(i,e){e!=null&&(this._materialParams[i]=e)}assignColor(i,e,t){if(e!=null){const n=new Ne().fromArray(e);t&&n.convertSRGBToLinear(),this._materialParams[i]=n}}assignTexture(i,e,t){return Di(this,null,function*(){const n=Di(this,null,function*(){if(e!=null){const r=yield this._parser.assignTexture(this._materialParams,i,e);if(r==null){console.warn("GLTFMToonMaterialParamsAssignHelper: Failed to load texture. The rendering result may be wrong");return}t&&pM(r,"srgb")}});return this._pendings.push(n),n})}assignTextureByIndex(i,e,t){return Di(this,null,function*(){return this.assignTexture(i,e!=null?{index:e}:void 0,t)})}},gM=`// #define PHONG

varying vec3 vViewPosition;

#ifndef FLAT_SHADED
  varying vec3 vNormal;
#endif

#include <common>

// #include <uv_pars_vertex>
#ifdef MTOON_USE_UV
  varying vec2 vUv;

  // COMPAT: pre-r151 uses a common uvTransform
  #if THREE_VRM_THREE_REVISION < 151
    uniform mat3 uvTransform;
  #endif
#endif

// #include <uv2_pars_vertex>
// COMAPT: pre-r151 uses uv2 for lightMap and aoMap
#if THREE_VRM_THREE_REVISION < 151
  #if defined( USE_LIGHTMAP ) || defined( USE_AOMAP )
    attribute vec2 uv2;
    varying vec2 vUv2;
    uniform mat3 uv2Transform;
  #endif
#endif

// #include <displacementmap_pars_vertex>
// #include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>

#ifdef USE_OUTLINEWIDTHMULTIPLYTEXTURE
  uniform sampler2D outlineWidthMultiplyTexture;
  uniform mat3 outlineWidthMultiplyTextureUvTransform;
#endif

uniform float outlineWidthFactor;

void main() {

  // #include <uv_vertex>
  #ifdef MTOON_USE_UV
    // COMPAT: pre-r151 uses a common uvTransform
    #if THREE_VRM_THREE_REVISION >= 151
      vUv = uv;
    #else
      vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
    #endif
  #endif

  // #include <uv2_vertex>
  // COMAPT: pre-r151 uses uv2 for lightMap and aoMap
  #if THREE_VRM_THREE_REVISION < 151
    #if defined( USE_LIGHTMAP ) || defined( USE_AOMAP )
      vUv2 = ( uv2Transform * vec3( uv2, 1 ) ).xy;
    #endif
  #endif

  #include <color_vertex>

  #include <beginnormal_vertex>
  #include <morphnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>

  // we need this to compute the outline properly
  objectNormal = normalize( objectNormal );

  #include <defaultnormal_vertex>

  #ifndef FLAT_SHADED // Normal computed with derivatives when FLAT_SHADED
    vNormal = normalize( transformedNormal );
  #endif

  #include <begin_vertex>

  #include <morphtarget_vertex>
  #include <skinning_vertex>
  // #include <displacementmap_vertex>
  #include <project_vertex>
  #include <logdepthbuf_vertex>
  #include <clipping_planes_vertex>

  vViewPosition = - mvPosition.xyz;

  #ifdef OUTLINE
    float worldNormalLength = length( transformedNormal );
    vec3 outlineOffset = outlineWidthFactor * worldNormalLength * objectNormal;

    #ifdef USE_OUTLINEWIDTHMULTIPLYTEXTURE
      vec2 outlineWidthMultiplyTextureUv = ( outlineWidthMultiplyTextureUvTransform * vec3( vUv, 1 ) ).xy;
      float outlineTex = texture2D( outlineWidthMultiplyTexture, outlineWidthMultiplyTextureUv ).g;
      outlineOffset *= outlineTex;
    #endif

    #ifdef OUTLINE_WIDTH_SCREEN
      outlineOffset *= vViewPosition.z / projectionMatrix[ 1 ].y;
    #endif

    gl_Position = projectionMatrix * modelViewMatrix * vec4( outlineOffset + transformed, 1.0 );

    gl_Position.z += 1E-6 * gl_Position.w; // anti-artifact magic
  #endif

  #include <worldpos_vertex>
  // #include <envmap_vertex>
  #include <shadowmap_vertex>
  #include <fog_vertex>

}`,_M=`// #define PHONG

uniform vec3 litFactor;

uniform float opacity;

uniform vec3 shadeColorFactor;
#ifdef USE_SHADEMULTIPLYTEXTURE
  uniform sampler2D shadeMultiplyTexture;
  uniform mat3 shadeMultiplyTextureUvTransform;
#endif

uniform float shadingShiftFactor;
uniform float shadingToonyFactor;

#ifdef USE_SHADINGSHIFTTEXTURE
  uniform sampler2D shadingShiftTexture;
  uniform mat3 shadingShiftTextureUvTransform;
  uniform float shadingShiftTextureScale;
#endif

uniform float giEqualizationFactor;

uniform vec3 parametricRimColorFactor;
#ifdef USE_RIMMULTIPLYTEXTURE
  uniform sampler2D rimMultiplyTexture;
  uniform mat3 rimMultiplyTextureUvTransform;
#endif
uniform float rimLightingMixFactor;
uniform float parametricRimFresnelPowerFactor;
uniform float parametricRimLiftFactor;

#ifdef USE_MATCAPTEXTURE
  uniform vec3 matcapFactor;
  uniform sampler2D matcapTexture;
  uniform mat3 matcapTextureUvTransform;
#endif

uniform vec3 emissive;
uniform float emissiveIntensity;

uniform vec3 outlineColorFactor;
uniform float outlineLightingMixFactor;

#ifdef USE_UVANIMATIONMASKTEXTURE
  uniform sampler2D uvAnimationMaskTexture;
  uniform mat3 uvAnimationMaskTextureUvTransform;
#endif

uniform float uvAnimationScrollXOffset;
uniform float uvAnimationScrollYOffset;
uniform float uvAnimationRotationPhase;

#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>

// #include <uv_pars_fragment>
#if ( defined( MTOON_USE_UV ) && !defined( MTOON_UVS_VERTEX_ONLY ) )
  varying vec2 vUv;
#endif

// #include <uv2_pars_fragment>
// COMAPT: pre-r151 uses uv2 for lightMap and aoMap
#if THREE_VRM_THREE_REVISION < 151
  #if defined( USE_LIGHTMAP ) || defined( USE_AOMAP )
    varying vec2 vUv2;
  #endif
#endif

#include <map_pars_fragment>

#ifdef USE_MAP
  uniform mat3 mapUvTransform;
#endif

// #include <alphamap_pars_fragment>

#include <alphatest_pars_fragment>

#include <aomap_pars_fragment>
// #include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>

#ifdef USE_EMISSIVEMAP
  uniform mat3 emissiveMapUvTransform;
#endif

// #include <envmap_common_pars_fragment>
// #include <envmap_pars_fragment>
// #include <cube_uv_reflection_fragment>
#include <fog_pars_fragment>

// #include <bsdfs>
// COMPAT: pre-r151 doesn't have BRDF_Lambert in <common>
#if THREE_VRM_THREE_REVISION < 151
  vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
    return RECIPROCAL_PI * diffuseColor;
  }
#endif

#include <lights_pars_begin>

#include <normal_pars_fragment>

// #include <lights_phong_pars_fragment>
varying vec3 vViewPosition;

struct MToonMaterial {
  vec3 diffuseColor;
  vec3 shadeColor;
  float shadingShift;
};

float linearstep( float a, float b, float t ) {
  return clamp( ( t - a ) / ( b - a ), 0.0, 1.0 );
}

/**
 * Convert NdotL into toon shading factor using shadingShift and shadingToony
 */
float getShading(
  const in float dotNL,
  const in float shadow,
  const in float shadingShift
) {
  float shading = dotNL;
  shading = shading + shadingShift;
  shading = linearstep( -1.0 + shadingToonyFactor, 1.0 - shadingToonyFactor, shading );
  shading *= shadow;
  return shading;
}

/**
 * Mix diffuseColor and shadeColor using shading factor and light color
 */
vec3 getDiffuse(
  const in MToonMaterial material,
  const in float shading,
  in vec3 lightColor
) {
  #ifdef DEBUG_LITSHADERATE
    return vec3( BRDF_Lambert( shading * lightColor ) );
  #endif

  vec3 col = lightColor * BRDF_Lambert( mix( material.shadeColor, material.diffuseColor, shading ) );

  // The "comment out if you want to PBR absolutely" line
  #ifdef V0_COMPAT_SHADE
    col = min( col, material.diffuseColor );
  #endif

  return col;
}

// COMPAT: pre-r156 uses a struct GeometricContext
#if THREE_VRM_THREE_REVISION >= 157
  void RE_Direct_MToon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in MToonMaterial material, const in float shadow, inout ReflectedLight reflectedLight ) {
    float dotNL = clamp( dot( geometryNormal, directLight.direction ), -1.0, 1.0 );
    vec3 irradiance = directLight.color;

    // directSpecular will be used for rim lighting, not an actual specular
    reflectedLight.directSpecular += irradiance;

    irradiance *= dotNL;

    float shading = getShading( dotNL, shadow, material.shadingShift );

    // toon shaded diffuse
    reflectedLight.directDiffuse += getDiffuse( material, shading, directLight.color );
  }

  void RE_IndirectDiffuse_MToon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in MToonMaterial material, inout ReflectedLight reflectedLight ) {
    // indirect diffuse will use diffuseColor, no shadeColor involved
    reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );

    // directSpecular will be used for rim lighting, not an actual specular
    reflectedLight.directSpecular += irradiance;
  }
#else
  void RE_Direct_MToon( const in IncidentLight directLight, const in GeometricContext geometry, const in MToonMaterial material, const in float shadow, inout ReflectedLight reflectedLight ) {
    float dotNL = clamp( dot( geometry.normal, directLight.direction ), -1.0, 1.0 );
    vec3 irradiance = directLight.color;

    // directSpecular will be used for rim lighting, not an actual specular
    reflectedLight.directSpecular += irradiance;

    irradiance *= dotNL;

    float shading = getShading( dotNL, shadow, material.shadingShift );

    // toon shaded diffuse
    reflectedLight.directDiffuse += getDiffuse( material, shading, directLight.color );
  }

  void RE_IndirectDiffuse_MToon( const in vec3 irradiance, const in GeometricContext geometry, const in MToonMaterial material, inout ReflectedLight reflectedLight ) {
    // indirect diffuse will use diffuseColor, no shadeColor involved
    reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );

    // directSpecular will be used for rim lighting, not an actual specular
    reflectedLight.directSpecular += irradiance;
  }
#endif

#define RE_Direct RE_Direct_MToon
#define RE_IndirectDiffuse RE_IndirectDiffuse_MToon
#define Material_LightProbeLOD( material ) (0)

#include <shadowmap_pars_fragment>
// #include <bumpmap_pars_fragment>

// #include <normalmap_pars_fragment>
#ifdef USE_NORMALMAP

  uniform sampler2D normalMap;
  uniform mat3 normalMapUvTransform;
  uniform vec2 normalScale;

#endif

// COMPAT: pre-r151
// USE_NORMALMAP_OBJECTSPACE used to be OBJECTSPACE_NORMALMAP in pre-r151
#if defined( USE_NORMALMAP_OBJECTSPACE ) || defined( OBJECTSPACE_NORMALMAP )

  uniform mat3 normalMatrix;

#endif

// COMPAT: pre-r151
// USE_NORMALMAP_TANGENTSPACE used to be TANGENTSPACE_NORMALMAP in pre-r151
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( TANGENTSPACE_NORMALMAP ) )

  // Per-Pixel Tangent Space Normal Mapping
  // http://hacksoflife.blogspot.ch/2009/11/per-pixel-tangent-space-normal-mapping.html

  // three-vrm specific change: it requires \`uv\` as an input in order to support uv scrolls

  // Temporary compat against shader change @ Three.js r126, r151
  #if THREE_VRM_THREE_REVISION >= 151

    mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {

      vec3 q0 = dFdx( eye_pos.xyz );
      vec3 q1 = dFdy( eye_pos.xyz );
      vec2 st0 = dFdx( uv.st );
      vec2 st1 = dFdy( uv.st );

      vec3 N = surf_norm;

      vec3 q1perp = cross( q1, N );
      vec3 q0perp = cross( N, q0 );

      vec3 T = q1perp * st0.x + q0perp * st1.x;
      vec3 B = q1perp * st0.y + q0perp * st1.y;

      float det = max( dot( T, T ), dot( B, B ) );
      float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );

      return mat3( T * scale, B * scale, N );

    }

  #else

    vec3 perturbNormal2Arb( vec2 uv, vec3 eye_pos, vec3 surf_norm, vec3 mapN, float faceDirection ) {

      vec3 q0 = vec3( dFdx( eye_pos.x ), dFdx( eye_pos.y ), dFdx( eye_pos.z ) );
      vec3 q1 = vec3( dFdy( eye_pos.x ), dFdy( eye_pos.y ), dFdy( eye_pos.z ) );
      vec2 st0 = dFdx( uv.st );
      vec2 st1 = dFdy( uv.st );

      vec3 N = normalize( surf_norm );

      vec3 q1perp = cross( q1, N );
      vec3 q0perp = cross( N, q0 );

      vec3 T = q1perp * st0.x + q0perp * st1.x;
      vec3 B = q1perp * st0.y + q0perp * st1.y;

      // three-vrm specific change: Workaround for the issue that happens when delta of uv = 0.0
      // TODO: Is this still required? Or shall I make a PR about it?
      if ( length( T ) == 0.0 || length( B ) == 0.0 ) {
        return surf_norm;
      }

      float det = max( dot( T, T ), dot( B, B ) );
      float scale = ( det == 0.0 ) ? 0.0 : faceDirection * inversesqrt( det );

      return normalize( T * ( mapN.x * scale ) + B * ( mapN.y * scale ) + N * mapN.z );

    }

  #endif

#endif

// #include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>

// == post correction ==========================================================
void postCorrection() {
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
  #include <premultiplied_alpha_fragment>
  #include <dithering_fragment>
}

// == main procedure ===========================================================
void main() {
  #include <clipping_planes_fragment>

  vec2 uv = vec2(0.5, 0.5);

  #if ( defined( MTOON_USE_UV ) && !defined( MTOON_UVS_VERTEX_ONLY ) )
    uv = vUv;

    float uvAnimMask = 1.0;
    #ifdef USE_UVANIMATIONMASKTEXTURE
      vec2 uvAnimationMaskTextureUv = ( uvAnimationMaskTextureUvTransform * vec3( uv, 1 ) ).xy;
      uvAnimMask = texture2D( uvAnimationMaskTexture, uvAnimationMaskTextureUv ).b;
    #endif

    float uvRotCos = cos( uvAnimationRotationPhase * uvAnimMask );
    float uvRotSin = sin( uvAnimationRotationPhase * uvAnimMask );
    uv = mat2( uvRotCos, -uvRotSin, uvRotSin, uvRotCos ) * ( uv - 0.5 ) + 0.5;
    uv = uv + vec2( uvAnimationScrollXOffset, uvAnimationScrollYOffset ) * uvAnimMask;
  #endif

  #ifdef DEBUG_UV
    gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
    #if ( defined( MTOON_USE_UV ) && !defined( MTOON_UVS_VERTEX_ONLY ) )
      gl_FragColor = vec4( uv, 0.0, 1.0 );
    #endif
    return;
  #endif

  vec4 diffuseColor = vec4( litFactor, opacity );
  ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
  vec3 totalEmissiveRadiance = emissive * emissiveIntensity;

  #include <logdepthbuf_fragment>

  // #include <map_fragment>
  #ifdef USE_MAP
    vec2 mapUv = ( mapUvTransform * vec3( uv, 1 ) ).xy;
    vec4 sampledDiffuseColor = texture2D( map, mapUv );
    #ifdef DECODE_VIDEO_TEXTURE
      sampledDiffuseColor = vec4( mix( pow( sampledDiffuseColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), sampledDiffuseColor.rgb * 0.0773993808, vec3( lessThanEqual( sampledDiffuseColor.rgb, vec3( 0.04045 ) ) ) ), sampledDiffuseColor.w );
    #endif
    diffuseColor *= sampledDiffuseColor;
  #endif

  // #include <color_fragment>
  #if ( defined( USE_COLOR ) && !defined( IGNORE_VERTEX_COLOR ) )
    diffuseColor.rgb *= vColor;
  #endif

  // #include <alphamap_fragment>

  #include <alphatest_fragment>

  // #include <specularmap_fragment>

  // #include <normal_fragment_begin>
  float faceDirection = gl_FrontFacing ? 1.0 : -1.0;

  #ifdef FLAT_SHADED

    vec3 fdx = dFdx( vViewPosition );
    vec3 fdy = dFdy( vViewPosition );
    vec3 normal = normalize( cross( fdx, fdy ) );

  #else

    vec3 normal = normalize( vNormal );

    #ifdef DOUBLE_SIDED

      normal *= faceDirection;

    #endif

  #endif

  #ifdef USE_NORMALMAP

    vec2 normalMapUv = ( normalMapUvTransform * vec3( uv, 1 ) ).xy;

  #endif

  #ifdef USE_NORMALMAP_TANGENTSPACE

    #ifdef USE_TANGENT

      mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );

    #else

      mat3 tbn = getTangentFrame( - vViewPosition, normal, normalMapUv );

    #endif

    #if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )

      tbn[0] *= faceDirection;
      tbn[1] *= faceDirection;

    #endif

  #endif

  #ifdef USE_CLEARCOAT_NORMALMAP

    #ifdef USE_TANGENT

      mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );

    #else

      mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );

    #endif

    #if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )

      tbn2[0] *= faceDirection;
      tbn2[1] *= faceDirection;

    #endif

  #endif

  // non perturbed normal for clearcoat among others

  vec3 nonPerturbedNormal = normal;

  #ifdef OUTLINE
    normal *= -1.0;
  #endif

  // #include <normal_fragment_maps>

  // COMPAT: pre-r151
  // USE_NORMALMAP_OBJECTSPACE used to be OBJECTSPACE_NORMALMAP in pre-r151
  #if defined( USE_NORMALMAP_OBJECTSPACE ) || defined( OBJECTSPACE_NORMALMAP )

    normal = texture2D( normalMap, normalMapUv ).xyz * 2.0 - 1.0; // overrides both flatShading and attribute normals

    #ifdef FLIP_SIDED

      normal = - normal;

    #endif

    #ifdef DOUBLE_SIDED

      normal = normal * faceDirection;

    #endif

    normal = normalize( normalMatrix * normal );

  // COMPAT: pre-r151
  // USE_NORMALMAP_TANGENTSPACE used to be TANGENTSPACE_NORMALMAP in pre-r151
  #elif defined( USE_NORMALMAP_TANGENTSPACE ) || defined( TANGENTSPACE_NORMALMAP )

    vec3 mapN = texture2D( normalMap, normalMapUv ).xyz * 2.0 - 1.0;
    mapN.xy *= normalScale;

    // COMPAT: pre-r151
    #if THREE_VRM_THREE_REVISION >= 151 || defined( USE_TANGENT )

      normal = normalize( tbn * mapN );

    #else

      normal = perturbNormal2Arb( uv, -vViewPosition, normal, mapN, faceDirection );

    #endif

  #endif

  // #include <emissivemap_fragment>
  #ifdef USE_EMISSIVEMAP
    vec2 emissiveMapUv = ( emissiveMapUvTransform * vec3( uv, 1 ) ).xy;
    totalEmissiveRadiance *= texture2D( emissiveMap, emissiveMapUv ).rgb;
  #endif

  #ifdef DEBUG_NORMAL
    gl_FragColor = vec4( 0.5 + 0.5 * normal, 1.0 );
    return;
  #endif

  // -- MToon: lighting --------------------------------------------------------
  // accumulation
  // #include <lights_phong_fragment>
  MToonMaterial material;

  material.diffuseColor = diffuseColor.rgb;

  material.shadeColor = shadeColorFactor;
  #ifdef USE_SHADEMULTIPLYTEXTURE
    vec2 shadeMultiplyTextureUv = ( shadeMultiplyTextureUvTransform * vec3( uv, 1 ) ).xy;
    material.shadeColor *= texture2D( shadeMultiplyTexture, shadeMultiplyTextureUv ).rgb;
  #endif

  #if ( defined( USE_COLOR ) && !defined( IGNORE_VERTEX_COLOR ) )
    material.shadeColor.rgb *= vColor;
  #endif

  material.shadingShift = shadingShiftFactor;
  #ifdef USE_SHADINGSHIFTTEXTURE
    vec2 shadingShiftTextureUv = ( shadingShiftTextureUvTransform * vec3( uv, 1 ) ).xy;
    material.shadingShift += texture2D( shadingShiftTexture, shadingShiftTextureUv ).r * shadingShiftTextureScale;
  #endif

  // #include <lights_fragment_begin>

  // MToon Specific changes:
  // Since we want to take shadows into account of shading instead of irradiance,
  // we had to modify the codes that multiplies the results of shadowmap into color of direct lights.

  // COMPAT: pre-r156 uses a struct GeometricContext
  #if THREE_VRM_THREE_REVISION >= 157
    vec3 geometryPosition = - vViewPosition;
    vec3 geometryNormal = normal;
    vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );

    vec3 geometryClearcoatNormal;

    #ifdef USE_CLEARCOAT

      geometryClearcoatNormal = clearcoatNormal;

    #endif
  #else
    GeometricContext geometry;

    geometry.position = - vViewPosition;
    geometry.normal = normal;
    geometry.viewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );

    #ifdef USE_CLEARCOAT

      geometry.clearcoatNormal = clearcoatNormal;

    #endif
  #endif

  IncidentLight directLight;

  // since these variables will be used in unrolled loop, we have to define in prior
  float shadow;

  #if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )

    PointLight pointLight;
    #if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
    PointLightShadow pointLightShadow;
    #endif

    #pragma unroll_loop_start
    for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {

      pointLight = pointLights[ i ];

      // COMPAT: pre-r156 uses a struct GeometricContext
      #if THREE_VRM_THREE_REVISION >= 157
        getPointLightInfo( pointLight, geometryPosition, directLight );
      #else
        getPointLightInfo( pointLight, geometry, directLight );
      #endif

      shadow = 1.0;
      #if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
      pointLightShadow = pointLightShadows[ i ];
      // COMPAT: pre-r166
      // r166 introduced shadowIntensity
      #if THREE_VRM_THREE_REVISION >= 166
        shadow = all( bvec2( directLight.visible, receiveShadow ) ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
      #else
        shadow = all( bvec2( directLight.visible, receiveShadow ) ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
      #endif
      #endif

      // COMPAT: pre-r156 uses a struct GeometricContext
      #if THREE_VRM_THREE_REVISION >= 157
        RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, shadow, reflectedLight );
      #else
        RE_Direct( directLight, geometry, material, shadow, reflectedLight );
      #endif

    }
    #pragma unroll_loop_end

  #endif

  #if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )

    SpotLight spotLight;
    // COMPAT: pre-r144 uses NUM_SPOT_LIGHT_SHADOWS, r144+ uses NUM_SPOT_LIGHT_COORDS
    #if THREE_VRM_THREE_REVISION >= 144
      #if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_COORDS > 0
      SpotLightShadow spotLightShadow;
      #endif
    #elif defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
    SpotLightShadow spotLightShadow;
    #endif

    #pragma unroll_loop_start
    for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {

      spotLight = spotLights[ i ];

      // COMPAT: pre-r156 uses a struct GeometricContext
      #if THREE_VRM_THREE_REVISION >= 157
        getSpotLightInfo( spotLight, geometryPosition, directLight );
      #else
        getSpotLightInfo( spotLight, geometry, directLight );
      #endif

      shadow = 1.0;
      // COMPAT: pre-r144 uses NUM_SPOT_LIGHT_SHADOWS and vSpotShadowCoord, r144+ uses NUM_SPOT_LIGHT_COORDS and vSpotLightCoord
      // COMPAT: pre-r166 does not have shadowIntensity, r166+ has shadowIntensity
      #if THREE_VRM_THREE_REVISION >= 166
        #if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_COORDS )
        spotLightShadow = spotLightShadows[ i ];
        shadow = all( bvec2( directLight.visible, receiveShadow ) ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
        #endif
      #elif THREE_VRM_THREE_REVISION >= 144
        #if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_COORDS )
        spotLightShadow = spotLightShadows[ i ];
        shadow = all( bvec2( directLight.visible, receiveShadow ) ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
        #endif
      #elif defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
      spotLightShadow = spotLightShadows[ i ];
      shadow = all( bvec2( directLight.visible, receiveShadow ) ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotShadowCoord[ i ] ) : 1.0;
      #endif

      // COMPAT: pre-r156 uses a struct GeometricContext
      #if THREE_VRM_THREE_REVISION >= 157
        RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, shadow, reflectedLight );
      #else
        RE_Direct( directLight, geometry, material, shadow, reflectedLight );
      #endif

    }
    #pragma unroll_loop_end

  #endif

  #if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )

    DirectionalLight directionalLight;
    #if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
    DirectionalLightShadow directionalLightShadow;
    #endif

    #pragma unroll_loop_start
    for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {

      directionalLight = directionalLights[ i ];

      // COMPAT: pre-r156 uses a struct GeometricContext
      #if THREE_VRM_THREE_REVISION >= 157
        getDirectionalLightInfo( directionalLight, directLight );
      #else
        getDirectionalLightInfo( directionalLight, geometry, directLight );
      #endif

      shadow = 1.0;
      #if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
      directionalLightShadow = directionalLightShadows[ i ];
      // COMPAT: pre-r166
      // r166 introduced shadowIntensity
      #if THREE_VRM_THREE_REVISION >= 166
        shadow = all( bvec2( directLight.visible, receiveShadow ) ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
      #else
        shadow = all( bvec2( directLight.visible, receiveShadow ) ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
      #endif
      #endif

      // COMPAT: pre-r156 uses a struct GeometricContext
      #if THREE_VRM_THREE_REVISION >= 157
        RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, shadow, reflectedLight );
      #else
        RE_Direct( directLight, geometry, material, shadow, reflectedLight );
      #endif

    }
    #pragma unroll_loop_end

  #endif

  // #if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )

  //   RectAreaLight rectAreaLight;

  //   #pragma unroll_loop_start
  //   for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {

  //     rectAreaLight = rectAreaLights[ i ];
  //     RE_Direct_RectArea( rectAreaLight, geometry, material, reflectedLight );

  //   }
  //   #pragma unroll_loop_end

  // #endif

  #if defined( RE_IndirectDiffuse )

    vec3 iblIrradiance = vec3( 0.0 );

    vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );

    // COMPAT: pre-r156 uses a struct GeometricContext
    // COMPAT: pre-r156 doesn't have a define USE_LIGHT_PROBES
    #if THREE_VRM_THREE_REVISION >= 157
      #if defined( USE_LIGHT_PROBES )
        irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
      #endif
    #else
      irradiance += getLightProbeIrradiance( lightProbe, geometry.normal );
    #endif

    #if ( NUM_HEMI_LIGHTS > 0 )

      #pragma unroll_loop_start
      for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {

        // COMPAT: pre-r156 uses a struct GeometricContext
        #if THREE_VRM_THREE_REVISION >= 157
          irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
        #else
          irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometry.normal );
        #endif

      }
      #pragma unroll_loop_end

    #endif

  #endif

  // #if defined( RE_IndirectSpecular )

  //   vec3 radiance = vec3( 0.0 );
  //   vec3 clearcoatRadiance = vec3( 0.0 );

  // #endif

  #include <lights_fragment_maps>
  #include <lights_fragment_end>

  // modulation
  #include <aomap_fragment>

  vec3 col = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;

  #ifdef DEBUG_LITSHADERATE
    gl_FragColor = vec4( col, diffuseColor.a );
    postCorrection();
    return;
  #endif

  // -- MToon: rim lighting -----------------------------------------
  vec3 viewDir = normalize( vViewPosition );

  #ifndef PHYSICALLY_CORRECT_LIGHTS
    reflectedLight.directSpecular /= PI;
  #endif
  vec3 rimMix = mix( vec3( 1.0 ), reflectedLight.directSpecular, rimLightingMixFactor );

  vec3 rim = parametricRimColorFactor * pow( saturate( 1.0 - dot( viewDir, normal ) + parametricRimLiftFactor ), parametricRimFresnelPowerFactor );

  #ifdef USE_MATCAPTEXTURE
    {
      vec3 x = normalize( vec3( viewDir.z, 0.0, -viewDir.x ) );
      vec3 y = cross( viewDir, x ); // guaranteed to be normalized
      vec2 sphereUv = 0.5 + 0.5 * vec2( dot( x, normal ), -dot( y, normal ) );
      sphereUv = ( matcapTextureUvTransform * vec3( sphereUv, 1 ) ).xy;
      vec3 matcap = texture2D( matcapTexture, sphereUv ).rgb;
      rim += matcapFactor * matcap;
    }
  #endif

  #ifdef USE_RIMMULTIPLYTEXTURE
    vec2 rimMultiplyTextureUv = ( rimMultiplyTextureUvTransform * vec3( uv, 1 ) ).xy;
    rim *= texture2D( rimMultiplyTexture, rimMultiplyTextureUv ).rgb;
  #endif

  col += rimMix * rim;

  // -- MToon: Emission --------------------------------------------------------
  col += totalEmissiveRadiance;

  // #include <envmap_fragment>

  // -- Almost done! -----------------------------------------------------------
  #if defined( OUTLINE )
    col = outlineColorFactor.rgb * mix( vec3( 1.0 ), col, outlineLightingMixFactor );
  #endif

  #ifdef OPAQUE
    diffuseColor.a = 1.0;
  #endif

  gl_FragColor = vec4( col, diffuseColor.a );
  postCorrection();
}
`,vM={None:"none"},Ku={None:"none",ScreenCoordinates:"screenCoordinates"},xM={3e3:"",3001:"srgb"};function pa(i){return parseInt(Ui,10)>=152?i.colorSpace:xM[i.encoding]}var MM=class extends xi{constructor(i={}){var e;super({vertexShader:gM,fragmentShader:_M}),this.uvAnimationScrollXSpeedFactor=0,this.uvAnimationScrollYSpeedFactor=0,this.uvAnimationRotationSpeedFactor=0,this.fog=!0,this.normalMapType=uo,this._ignoreVertexColor=!0,this._v0CompatShade=!1,this._debugMode=vM.None,this._outlineWidthMode=Ku.None,this._isOutline=!1,i.transparentWithZWrite&&(i.depthWrite=!0),delete i.transparentWithZWrite,i.fog=!0,i.lights=!0,i.clipping=!0,this.uniforms=$h.merge([xe.common,xe.normalmap,xe.emissivemap,xe.fog,xe.lights,{litFactor:{value:new Ne(1,1,1)},mapUvTransform:{value:new Oe},colorAlpha:{value:1},normalMapUvTransform:{value:new Oe},shadeColorFactor:{value:new Ne(0,0,0)},shadeMultiplyTexture:{value:null},shadeMultiplyTextureUvTransform:{value:new Oe},shadingShiftFactor:{value:0},shadingShiftTexture:{value:null},shadingShiftTextureUvTransform:{value:new Oe},shadingShiftTextureScale:{value:1},shadingToonyFactor:{value:.9},giEqualizationFactor:{value:.9},matcapFactor:{value:new Ne(1,1,1)},matcapTexture:{value:null},matcapTextureUvTransform:{value:new Oe},parametricRimColorFactor:{value:new Ne(0,0,0)},rimMultiplyTexture:{value:null},rimMultiplyTextureUvTransform:{value:new Oe},rimLightingMixFactor:{value:1},parametricRimFresnelPowerFactor:{value:5},parametricRimLiftFactor:{value:0},emissive:{value:new Ne(0,0,0)},emissiveIntensity:{value:1},emissiveMapUvTransform:{value:new Oe},outlineWidthMultiplyTexture:{value:null},outlineWidthMultiplyTextureUvTransform:{value:new Oe},outlineWidthFactor:{value:0},outlineColorFactor:{value:new Ne(0,0,0)},outlineLightingMixFactor:{value:1},uvAnimationMaskTexture:{value:null},uvAnimationMaskTextureUvTransform:{value:new Oe},uvAnimationScrollXOffset:{value:0},uvAnimationScrollYOffset:{value:0},uvAnimationRotationPhase:{value:0}},(e=i.uniforms)!=null?e:{}]),this.setValues(i),this._uploadUniformsWorkaround(),this.customProgramCacheKey=()=>[...Object.entries(this._generateDefines()).map(([t,n])=>`${t}:${n}`),this.matcapTexture?`matcapTextureColorSpace:${pa(this.matcapTexture)}`:"",this.shadeMultiplyTexture?`shadeMultiplyTextureColorSpace:${pa(this.shadeMultiplyTexture)}`:"",this.rimMultiplyTexture?`rimMultiplyTextureColorSpace:${pa(this.rimMultiplyTexture)}`:""].join(","),this.onBeforeCompile=t=>{const n=parseInt(Ui,10),r=Object.entries(Yu(Yu({},this._generateDefines()),this.defines)).filter(([s,o])=>!!o).map(([s,o])=>`#define ${s} ${o}`).join(`
`)+`
`;t.vertexShader=r+t.vertexShader,t.fragmentShader=r+t.fragmentShader,n<154&&(t.fragmentShader=t.fragmentShader.replace("#include <colorspace_fragment>","#include <encodings_fragment>"))}}get color(){return this.uniforms.litFactor.value}set color(i){this.uniforms.litFactor.value=i}get map(){return this.uniforms.map.value}set map(i){this.uniforms.map.value=i}get normalMap(){return this.uniforms.normalMap.value}set normalMap(i){this.uniforms.normalMap.value=i}get normalScale(){return this.uniforms.normalScale.value}set normalScale(i){this.uniforms.normalScale.value=i}get emissive(){return this.uniforms.emissive.value}set emissive(i){this.uniforms.emissive.value=i}get emissiveIntensity(){return this.uniforms.emissiveIntensity.value}set emissiveIntensity(i){this.uniforms.emissiveIntensity.value=i}get emissiveMap(){return this.uniforms.emissiveMap.value}set emissiveMap(i){this.uniforms.emissiveMap.value=i}get shadeColorFactor(){return this.uniforms.shadeColorFactor.value}set shadeColorFactor(i){this.uniforms.shadeColorFactor.value=i}get shadeMultiplyTexture(){return this.uniforms.shadeMultiplyTexture.value}set shadeMultiplyTexture(i){this.uniforms.shadeMultiplyTexture.value=i}get shadingShiftFactor(){return this.uniforms.shadingShiftFactor.value}set shadingShiftFactor(i){this.uniforms.shadingShiftFactor.value=i}get shadingShiftTexture(){return this.uniforms.shadingShiftTexture.value}set shadingShiftTexture(i){this.uniforms.shadingShiftTexture.value=i}get shadingShiftTextureScale(){return this.uniforms.shadingShiftTextureScale.value}set shadingShiftTextureScale(i){this.uniforms.shadingShiftTextureScale.value=i}get shadingToonyFactor(){return this.uniforms.shadingToonyFactor.value}set shadingToonyFactor(i){this.uniforms.shadingToonyFactor.value=i}get giEqualizationFactor(){return this.uniforms.giEqualizationFactor.value}set giEqualizationFactor(i){this.uniforms.giEqualizationFactor.value=i}get matcapFactor(){return this.uniforms.matcapFactor.value}set matcapFactor(i){this.uniforms.matcapFactor.value=i}get matcapTexture(){return this.uniforms.matcapTexture.value}set matcapTexture(i){this.uniforms.matcapTexture.value=i}get parametricRimColorFactor(){return this.uniforms.parametricRimColorFactor.value}set parametricRimColorFactor(i){this.uniforms.parametricRimColorFactor.value=i}get rimMultiplyTexture(){return this.uniforms.rimMultiplyTexture.value}set rimMultiplyTexture(i){this.uniforms.rimMultiplyTexture.value=i}get rimLightingMixFactor(){return this.uniforms.rimLightingMixFactor.value}set rimLightingMixFactor(i){this.uniforms.rimLightingMixFactor.value=i}get parametricRimFresnelPowerFactor(){return this.uniforms.parametricRimFresnelPowerFactor.value}set parametricRimFresnelPowerFactor(i){this.uniforms.parametricRimFresnelPowerFactor.value=i}get parametricRimLiftFactor(){return this.uniforms.parametricRimLiftFactor.value}set parametricRimLiftFactor(i){this.uniforms.parametricRimLiftFactor.value=i}get outlineWidthMultiplyTexture(){return this.uniforms.outlineWidthMultiplyTexture.value}set outlineWidthMultiplyTexture(i){this.uniforms.outlineWidthMultiplyTexture.value=i}get outlineWidthFactor(){return this.uniforms.outlineWidthFactor.value}set outlineWidthFactor(i){this.uniforms.outlineWidthFactor.value=i}get outlineColorFactor(){return this.uniforms.outlineColorFactor.value}set outlineColorFactor(i){this.uniforms.outlineColorFactor.value=i}get outlineLightingMixFactor(){return this.uniforms.outlineLightingMixFactor.value}set outlineLightingMixFactor(i){this.uniforms.outlineLightingMixFactor.value=i}get uvAnimationMaskTexture(){return this.uniforms.uvAnimationMaskTexture.value}set uvAnimationMaskTexture(i){this.uniforms.uvAnimationMaskTexture.value=i}get uvAnimationScrollXOffset(){return this.uniforms.uvAnimationScrollXOffset.value}set uvAnimationScrollXOffset(i){this.uniforms.uvAnimationScrollXOffset.value=i}get uvAnimationScrollYOffset(){return this.uniforms.uvAnimationScrollYOffset.value}set uvAnimationScrollYOffset(i){this.uniforms.uvAnimationScrollYOffset.value=i}get uvAnimationRotationPhase(){return this.uniforms.uvAnimationRotationPhase.value}set uvAnimationRotationPhase(i){this.uniforms.uvAnimationRotationPhase.value=i}get ignoreVertexColor(){return this._ignoreVertexColor}set ignoreVertexColor(i){this._ignoreVertexColor=i,this.needsUpdate=!0}get v0CompatShade(){return this._v0CompatShade}set v0CompatShade(i){this._v0CompatShade=i,this.needsUpdate=!0}get debugMode(){return this._debugMode}set debugMode(i){this._debugMode=i,this.needsUpdate=!0}get outlineWidthMode(){return this._outlineWidthMode}set outlineWidthMode(i){this._outlineWidthMode=i,this.needsUpdate=!0}get isOutline(){return this._isOutline}set isOutline(i){this._isOutline=i,this.needsUpdate=!0}get isMToonMaterial(){return!0}update(i){this._uploadUniformsWorkaround(),this._updateUVAnimation(i)}copy(i){return super.copy(i),this.map=i.map,this.normalMap=i.normalMap,this.emissiveMap=i.emissiveMap,this.shadeMultiplyTexture=i.shadeMultiplyTexture,this.shadingShiftTexture=i.shadingShiftTexture,this.matcapTexture=i.matcapTexture,this.rimMultiplyTexture=i.rimMultiplyTexture,this.outlineWidthMultiplyTexture=i.outlineWidthMultiplyTexture,this.uvAnimationMaskTexture=i.uvAnimationMaskTexture,this.normalMapType=i.normalMapType,this.uvAnimationScrollXSpeedFactor=i.uvAnimationScrollXSpeedFactor,this.uvAnimationScrollYSpeedFactor=i.uvAnimationScrollYSpeedFactor,this.uvAnimationRotationSpeedFactor=i.uvAnimationRotationSpeedFactor,this.ignoreVertexColor=i.ignoreVertexColor,this.v0CompatShade=i.v0CompatShade,this.debugMode=i.debugMode,this.outlineWidthMode=i.outlineWidthMode,this.isOutline=i.isOutline,this.needsUpdate=!0,this}_updateUVAnimation(i){this.uniforms.uvAnimationScrollXOffset.value+=i*this.uvAnimationScrollXSpeedFactor,this.uniforms.uvAnimationScrollYOffset.value+=i*this.uvAnimationScrollYSpeedFactor,this.uniforms.uvAnimationRotationPhase.value+=i*this.uvAnimationRotationSpeedFactor,this.uniforms.alphaTest.value=this.alphaTest,this.uniformsNeedUpdate=!0}_uploadUniformsWorkaround(){this.uniforms.opacity.value=this.opacity,this._updateTextureMatrix(this.uniforms.map,this.uniforms.mapUvTransform),this._updateTextureMatrix(this.uniforms.normalMap,this.uniforms.normalMapUvTransform),this._updateTextureMatrix(this.uniforms.emissiveMap,this.uniforms.emissiveMapUvTransform),this._updateTextureMatrix(this.uniforms.shadeMultiplyTexture,this.uniforms.shadeMultiplyTextureUvTransform),this._updateTextureMatrix(this.uniforms.shadingShiftTexture,this.uniforms.shadingShiftTextureUvTransform),this._updateTextureMatrix(this.uniforms.matcapTexture,this.uniforms.matcapTextureUvTransform),this._updateTextureMatrix(this.uniforms.rimMultiplyTexture,this.uniforms.rimMultiplyTextureUvTransform),this._updateTextureMatrix(this.uniforms.outlineWidthMultiplyTexture,this.uniforms.outlineWidthMultiplyTextureUvTransform),this._updateTextureMatrix(this.uniforms.uvAnimationMaskTexture,this.uniforms.uvAnimationMaskTextureUvTransform),this.uniformsNeedUpdate=!0}_generateDefines(){const i=parseInt(Ui,10),e=this.outlineWidthMultiplyTexture!==null,t=this.map!==null||this.normalMap!==null||this.emissiveMap!==null||this.shadeMultiplyTexture!==null||this.shadingShiftTexture!==null||this.rimMultiplyTexture!==null||this.uvAnimationMaskTexture!==null;return{THREE_VRM_THREE_REVISION:i,OUTLINE:this._isOutline,MTOON_USE_UV:e||t,MTOON_UVS_VERTEX_ONLY:e&&!t,V0_COMPAT_SHADE:this._v0CompatShade,USE_SHADEMULTIPLYTEXTURE:this.shadeMultiplyTexture!==null,USE_SHADINGSHIFTTEXTURE:this.shadingShiftTexture!==null,USE_MATCAPTEXTURE:this.matcapTexture!==null,USE_RIMMULTIPLYTEXTURE:this.rimMultiplyTexture!==null,USE_OUTLINEWIDTHMULTIPLYTEXTURE:this._isOutline&&this.outlineWidthMultiplyTexture!==null,USE_UVANIMATIONMASKTEXTURE:this.uvAnimationMaskTexture!==null,IGNORE_VERTEX_COLOR:this._ignoreVertexColor===!0,DEBUG_NORMAL:this._debugMode==="normal",DEBUG_LITSHADERATE:this._debugMode==="litShadeRate",DEBUG_UV:this._debugMode==="uv",OUTLINE_WIDTH_SCREEN:this._isOutline&&this._outlineWidthMode===Ku.ScreenCoordinates}}_updateTextureMatrix(i,e){i.value&&(i.value.matrixAutoUpdate&&i.value.updateMatrix(),e.value.copy(i.value.matrix))}},SM=new Set(["1.0","1.0-beta"]),Cd=class oo{get name(){return oo.EXTENSION_NAME}constructor(e,t={}){var n,r,s,o;this.parser=e,this.materialType=(n=t.materialType)!=null?n:MM,this.renderOrderOffset=(r=t.renderOrderOffset)!=null?r:0,this.v0CompatShade=(s=t.v0CompatShade)!=null?s:!1,this.debugMode=(o=t.debugMode)!=null?o:"none",this._mToonMaterialSet=new Set}beforeRoot(){return Di(this,null,function*(){this._removeUnlitExtensionIfMToonExists()})}afterRoot(e){return Di(this,null,function*(){e.userData.vrmMToonMaterials=Array.from(this._mToonMaterialSet)})}getMaterialType(e){return this._getMToonExtension(e)?this.materialType:null}extendMaterialParams(e,t){const n=this._getMToonExtension(e);return n?this._extendMaterialParams(n,t):null}loadMesh(e){return Di(this,null,function*(){var t;const n=this.parser,s=(t=n.json.meshes)==null?void 0:t[e];if(s==null)throw new Error(`MToonMaterialLoaderPlugin: Attempt to use meshes[${e}] of glTF but the mesh doesn't exist`);const o=s.primitives,a=yield n.loadMesh(e);if(o.length===1){const l=a,c=o[0].material;c!=null&&this._setupPrimitive(l,c)}else{const l=a;for(let c=0;c<o.length;c++){const u=l.children[c],h=o[c].material;h!=null&&this._setupPrimitive(u,h)}}return a})}_removeUnlitExtensionIfMToonExists(){const n=this.parser.json.materials;n?.map((r,s)=>{var o;this._getMToonExtension(s)&&((o=r.extensions)!=null&&o.KHR_materials_unlit)&&delete r.extensions.KHR_materials_unlit})}_getMToonExtension(e){var t,n;const o=(t=this.parser.json.materials)==null?void 0:t[e];if(o==null){console.warn(`MToonMaterialLoaderPlugin: Attempt to use materials[${e}] of glTF but the material doesn't exist`);return}const a=(n=o.extensions)==null?void 0:n[oo.EXTENSION_NAME];if(a==null)return;const l=a.specVersion;if(!SM.has(l)){console.warn(`MToonMaterialLoaderPlugin: Unknown ${oo.EXTENSION_NAME} specVersion "${l}"`);return}return a}_extendMaterialParams(e,t){return Di(this,null,function*(){var n;delete t.metalness,delete t.roughness;const r=new mM(this.parser,t);r.assignPrimitive("transparentWithZWrite",e.transparentWithZWrite),r.assignColor("shadeColorFactor",e.shadeColorFactor),r.assignTexture("shadeMultiplyTexture",e.shadeMultiplyTexture,!0),r.assignPrimitive("shadingShiftFactor",e.shadingShiftFactor),r.assignTexture("shadingShiftTexture",e.shadingShiftTexture,!0),r.assignPrimitive("shadingShiftTextureScale",(n=e.shadingShiftTexture)==null?void 0:n.scale),r.assignPrimitive("shadingToonyFactor",e.shadingToonyFactor),r.assignPrimitive("giEqualizationFactor",e.giEqualizationFactor),r.assignColor("matcapFactor",e.matcapFactor),r.assignTexture("matcapTexture",e.matcapTexture,!0),r.assignColor("parametricRimColorFactor",e.parametricRimColorFactor),r.assignTexture("rimMultiplyTexture",e.rimMultiplyTexture,!0),r.assignPrimitive("rimLightingMixFactor",e.rimLightingMixFactor),r.assignPrimitive("parametricRimFresnelPowerFactor",e.parametricRimFresnelPowerFactor),r.assignPrimitive("parametricRimLiftFactor",e.parametricRimLiftFactor),r.assignPrimitive("outlineWidthMode",e.outlineWidthMode),r.assignPrimitive("outlineWidthFactor",e.outlineWidthFactor),r.assignTexture("outlineWidthMultiplyTexture",e.outlineWidthMultiplyTexture,!1),r.assignColor("outlineColorFactor",e.outlineColorFactor),r.assignPrimitive("outlineLightingMixFactor",e.outlineLightingMixFactor),r.assignTexture("uvAnimationMaskTexture",e.uvAnimationMaskTexture,!1),r.assignPrimitive("uvAnimationScrollXSpeedFactor",e.uvAnimationScrollXSpeedFactor),r.assignPrimitive("uvAnimationScrollYSpeedFactor",e.uvAnimationScrollYSpeedFactor),r.assignPrimitive("uvAnimationRotationSpeedFactor",e.uvAnimationRotationSpeedFactor),r.assignPrimitive("v0CompatShade",this.v0CompatShade),r.assignPrimitive("debugMode",this.debugMode),yield r.pending})}_setupPrimitive(e,t){const n=this._getMToonExtension(t);if(n){const r=this._parseRenderOrder(n);e.renderOrder=r+this.renderOrderOffset,this._generateOutline(e),this._addToMaterialSet(e);return}}_shouldGenerateOutline(e){return typeof e.outlineWidthMode=="string"&&e.outlineWidthMode!=="none"&&typeof e.outlineWidthFactor=="number"&&e.outlineWidthFactor>0}_generateOutline(e){const t=e.material;if(!(t instanceof Sn)||!this._shouldGenerateOutline(t))return;e.material=[t];const n=t.clone();n.name+=" (Outline)",n.isOutline=!0,n.side=Yt,e.material.push(n);const r=e.geometry,s=r.index?r.index.count:r.attributes.position.count/3;r.addGroup(0,s,0),r.addGroup(0,s,1)}_addToMaterialSet(e){const t=e.material,n=new Set;Array.isArray(t)?t.forEach(r=>n.add(r)):n.add(t);for(const r of n)this._mToonMaterialSet.add(r)}_parseRenderOrder(e){var t;return(e.transparentWithZWrite?0:19)+((t=e.renderQueueOffsetNumber)!=null?t:0)}};Cd.EXTENSION_NAME="VRMC_materials_mtoon";var yM=Cd,TM=(i,e,t)=>new Promise((n,r)=>{var s=l=>{try{a(t.next(l))}catch(c){r(c)}},o=l=>{try{a(t.throw(l))}catch(c){r(c)}},a=l=>l.done?n(l.value):Promise.resolve(l.value).then(s,o);a((t=t.apply(i,e)).next())}),Pd=class vl{get name(){return vl.EXTENSION_NAME}constructor(e){this.parser=e}extendMaterialParams(e,t){return TM(this,null,function*(){const n=this._getHDREmissiveMultiplierExtension(e);if(n==null)return;console.warn("VRMMaterialsHDREmissiveMultiplierLoaderPlugin: `VRMC_materials_hdr_emissiveMultiplier` is archived. Use `KHR_materials_emissive_strength` instead.");const r=n.emissiveMultiplier;t.emissiveIntensity=r})}_getHDREmissiveMultiplierExtension(e){var t,n;const o=(t=this.parser.json.materials)==null?void 0:t[e];if(o==null){console.warn(`VRMMaterialsHDREmissiveMultiplierLoaderPlugin: Attempt to use materials[${e}] of glTF but the material doesn't exist`);return}const a=(n=o.extensions)==null?void 0:n[vl.EXTENSION_NAME];if(a!=null)return a}};Pd.EXTENSION_NAME="VRMC_materials_hdr_emissiveMultiplier";var EM=Pd,bM=Object.defineProperty,AM=Object.defineProperties,wM=Object.getOwnPropertyDescriptors,$u=Object.getOwnPropertySymbols,RM=Object.prototype.hasOwnProperty,CM=Object.prototype.propertyIsEnumerable,Zu=(i,e,t)=>e in i?bM(i,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):i[e]=t,Pn=(i,e)=>{for(var t in e||(e={}))RM.call(e,t)&&Zu(i,t,e[t]);if($u)for(var t of $u(e))CM.call(e,t)&&Zu(i,t,e[t]);return i},Ju=(i,e)=>AM(i,wM(e)),PM=(i,e,t)=>new Promise((n,r)=>{var s=l=>{try{a(t.next(l))}catch(c){r(c)}},o=l=>{try{a(t.throw(l))}catch(c){r(c)}},a=l=>l.done?n(l.value):Promise.resolve(l.value).then(s,o);a((t=t.apply(i,e)).next())});function rr(i){return Math.pow(i,2.2)}var LM=class{get name(){return"VRMMaterialsV0CompatPlugin"}constructor(i){var e;this.parser=i,this._renderQueueMapTransparent=new Map,this._renderQueueMapTransparentZWrite=new Map;const t=this.parser.json;t.extensionsUsed=(e=t.extensionsUsed)!=null?e:[],t.extensionsUsed.indexOf("KHR_texture_transform")===-1&&t.extensionsUsed.push("KHR_texture_transform")}beforeRoot(){return PM(this,null,function*(){var i;const e=this.parser.json,t=(i=e.extensions)==null?void 0:i.VRM,n=t?.materialProperties;n&&(this._populateRenderQueueMap(n),n.forEach((r,s)=>{var o,a;const l=(o=e.materials)==null?void 0:o[s];if(l==null){console.warn(`VRMMaterialsV0CompatPlugin: Attempt to use materials[${s}] of glTF but the material doesn't exist`);return}if(r.shader==="VRM/MToon"){const c=this._parseV0MToonProperties(r,l);e.materials[s]=c}else if((a=r.shader)!=null&&a.startsWith("VRM/Unlit")){const c=this._parseV0UnlitProperties(r,l);e.materials[s]=c}else r.shader==="VRM_USE_GLTFSHADER"||console.warn(`VRMMaterialsV0CompatPlugin: Unknown shader: ${r.shader}`)}))})}_parseV0MToonProperties(i,e){var t,n,r,s,o,a,l,c,u,h,d,f,g,v,p,m,x,A,y,b,E,_,S,D,R,N,O,W,L,G,z,B,ee,Y,Z,te,ye,ke,Q,me,Me,Pe,_e,Be,dt,Ce,Ke,Ze,He,st,et,ot,F,re,oe;const Te=(n=(t=i.keywordMap)==null?void 0:t._ALPHABLEND_ON)!=null?n:!1,Ge=((r=i.floatProperties)==null?void 0:r._ZWrite)===1&&Te,U=this._v0ParseRenderQueue(i),Qe=(o=(s=i.keywordMap)==null?void 0:s._ALPHATEST_ON)!=null?o:!1,pt=Te?"BLEND":Qe?"MASK":"OPAQUE",mt=Qe?(l=(a=i.floatProperties)==null?void 0:a._Cutoff)!=null?l:.5:void 0,$e=((u=(c=i.floatProperties)==null?void 0:c._CullMode)!=null?u:2)===0,fe=this._portTextureTransform(i),Ue=((d=(h=i.vectorProperties)==null?void 0:h._Color)!=null?d:[1,1,1,1]).map((bn,Pr)=>Pr===3?bn:rr(bn)),w=(f=i.textureProperties)==null?void 0:f._MainTex,M=w!=null?{index:w,extensions:Pn({},fe)}:void 0,k=(v=(g=i.floatProperties)==null?void 0:g._BumpScale)!=null?v:1,ie=(p=i.textureProperties)==null?void 0:p._BumpMap,q=ie!=null?{index:ie,scale:k,extensions:Pn({},fe)}:void 0,ne=((x=(m=i.vectorProperties)==null?void 0:m._EmissionColor)!=null?x:[0,0,0,1]).map(rr),he=(A=i.textureProperties)==null?void 0:A._EmissionMap,$=he!=null?{index:he,extensions:Pn({},fe)}:void 0,j=((b=(y=i.vectorProperties)==null?void 0:y._ShadeColor)!=null?b:[.97,.81,.86,1]).map(rr),ue=(E=i.textureProperties)==null?void 0:E._ShadeTexture,P=ue!=null?{index:ue,extensions:Pn({},fe)}:void 0;let J=(S=(_=i.floatProperties)==null?void 0:_._ShadeShift)!=null?S:0,K=(R=(D=i.floatProperties)==null?void 0:D._ShadeToony)!=null?R:.9;K=ut.lerp(K,1,.5+.5*J),J=-J-(1-K);const le=(O=(N=i.floatProperties)==null?void 0:N._IndirectLightIntensity)!=null?O:.1,ae=le?1-le:void 0,ce=(W=i.textureProperties)==null?void 0:W._SphereAdd,be=ce!=null?[1,1,1]:void 0,Ae=ce!=null?{index:ce}:void 0,se=(G=(L=i.floatProperties)==null?void 0:L._RimLightingMix)!=null?G:0,Ie=(z=i.textureProperties)==null?void 0:z._RimTexture,We=Ie!=null?{index:Ie,extensions:Pn({},fe)}:void 0,de=((ee=(B=i.vectorProperties)==null?void 0:B._RimColor)!=null?ee:[0,0,0,1]).map(rr),at=(Z=(Y=i.floatProperties)==null?void 0:Y._RimFresnelPower)!=null?Z:1,bt=(ye=(te=i.floatProperties)==null?void 0:te._RimLift)!=null?ye:0,nn=["none","worldCoordinates","screenCoordinates"][(Q=(ke=i.floatProperties)==null?void 0:ke._OutlineWidthMode)!=null?Q:0];let cn=(Me=(me=i.floatProperties)==null?void 0:me._OutlineWidth)!=null?Me:0;cn=.01*cn;const un=(Pe=i.textureProperties)==null?void 0:Pe._OutlineWidthTexture,Rr=un!=null?{index:un,extensions:Pn({},fe)}:void 0,Vi=((Be=(_e=i.vectorProperties)==null?void 0:_e._OutlineColor)!=null?Be:[0,0,0]).map(rr),hn=((Ce=(dt=i.floatProperties)==null?void 0:dt._OutlineColorMode)!=null?Ce:0)===1?(Ze=(Ke=i.floatProperties)==null?void 0:Ke._OutlineLightingMix)!=null?Ze:1:0,ni=(He=i.textureProperties)==null?void 0:He._UvAnimMaskTexture,Hi=ni!=null?{index:ni,extensions:Pn({},fe)}:void 0,Mi=(et=(st=i.floatProperties)==null?void 0:st._UvAnimScrollX)!=null?et:0;let dn=(F=(ot=i.floatProperties)==null?void 0:ot._UvAnimScrollY)!=null?F:0;dn!=null&&(dn=-dn);const At=(oe=(re=i.floatProperties)==null?void 0:re._UvAnimRotation)!=null?oe:0,ii={specVersion:"1.0",transparentWithZWrite:Ge,renderQueueOffsetNumber:U,shadeColorFactor:j,shadeMultiplyTexture:P,shadingShiftFactor:J,shadingToonyFactor:K,giEqualizationFactor:ae,matcapFactor:be,matcapTexture:Ae,rimLightingMixFactor:se,rimMultiplyTexture:We,parametricRimColorFactor:de,parametricRimFresnelPowerFactor:at,parametricRimLiftFactor:bt,outlineWidthMode:nn,outlineWidthFactor:cn,outlineWidthMultiplyTexture:Rr,outlineColorFactor:Vi,outlineLightingMixFactor:hn,uvAnimationMaskTexture:Hi,uvAnimationScrollXSpeedFactor:Mi,uvAnimationScrollYSpeedFactor:dn,uvAnimationRotationSpeedFactor:At};return Ju(Pn({},e),{pbrMetallicRoughness:{baseColorFactor:Ue,baseColorTexture:M},normalTexture:q,emissiveTexture:$,emissiveFactor:ne,alphaMode:pt,alphaCutoff:mt,doubleSided:$e,extensions:{VRMC_materials_mtoon:ii}})}_parseV0UnlitProperties(i,e){var t,n,r,s,o;const a=i.shader==="VRM/UnlitTransparentZWrite",l=i.shader==="VRM/UnlitTransparent"||a,c=this._v0ParseRenderQueue(i),u=i.shader==="VRM/UnlitCutout",h=l?"BLEND":u?"MASK":"OPAQUE",d=u?(n=(t=i.floatProperties)==null?void 0:t._Cutoff)!=null?n:.5:void 0,f=this._portTextureTransform(i),g=((s=(r=i.vectorProperties)==null?void 0:r._Color)!=null?s:[1,1,1,1]).map(rr),v=(o=i.textureProperties)==null?void 0:o._MainTex,p=v!=null?{index:v,extensions:Pn({},f)}:void 0,m={specVersion:"1.0",transparentWithZWrite:a,renderQueueOffsetNumber:c,shadeColorFactor:g,shadeMultiplyTexture:p};return Ju(Pn({},e),{pbrMetallicRoughness:{baseColorFactor:g,baseColorTexture:p},alphaMode:h,alphaCutoff:d,extensions:{VRMC_materials_mtoon:m}})}_portTextureTransform(i){var e,t,n,r,s;const o=(e=i.vectorProperties)==null?void 0:e._MainTex;if(o==null)return{};const a=[(t=o?.[0])!=null?t:0,(n=o?.[1])!=null?n:0],l=[(r=o?.[2])!=null?r:1,(s=o?.[3])!=null?s:1];return a[1]=1-l[1]-a[1],{KHR_texture_transform:{offset:a,scale:l}}}_v0ParseRenderQueue(i){var e,t;const n=i.shader==="VRM/UnlitTransparentZWrite",r=((e=i.keywordMap)==null?void 0:e._ALPHABLEND_ON)!=null||i.shader==="VRM/UnlitTransparent"||n,s=((t=i.floatProperties)==null?void 0:t._ZWrite)===1||n;let o=0;if(r){const a=i.renderQueue;a!=null&&(s?o=this._renderQueueMapTransparentZWrite.get(a):o=this._renderQueueMapTransparent.get(a))}return o}_populateRenderQueueMap(i){const e=new Set,t=new Set;i.forEach(n=>{var r,s;const o=n.shader==="VRM/UnlitTransparentZWrite",a=((r=n.keywordMap)==null?void 0:r._ALPHABLEND_ON)!=null||n.shader==="VRM/UnlitTransparent"||o,l=((s=n.floatProperties)==null?void 0:s._ZWrite)===1||o;if(a){const c=n.renderQueue;c!=null&&(l?t.add(c):e.add(c))}}),e.size>10&&console.warn(`VRMMaterialsV0CompatPlugin: This VRM uses ${e.size} render queues for Transparent materials while VRM 1.0 only supports up to 10 render queues. The model might not be rendered correctly.`),t.size>10&&console.warn(`VRMMaterialsV0CompatPlugin: This VRM uses ${t.size} render queues for TransparentZWrite materials while VRM 1.0 only supports up to 10 render queues. The model might not be rendered correctly.`),Array.from(e).sort().forEach((n,r)=>{const s=Math.min(Math.max(r-e.size+1,-9),0);this._renderQueueMapTransparent.set(n,s)}),Array.from(t).sort().forEach((n,r)=>{const s=Math.min(Math.max(r,0),9);this._renderQueueMapTransparentZWrite.set(n,s)})}},Qu=(i,e,t)=>new Promise((n,r)=>{var s=l=>{try{a(t.next(l))}catch(c){r(c)}},o=l=>{try{a(t.throw(l))}catch(c){r(c)}},a=l=>l.done?n(l.value):Promise.resolve(l.value).then(s,o);a((t=t.apply(i,e)).next())}),hi=new C,ma=class extends $t{constructor(i){super(),this._attrPosition=new vt(new Float32Array([0,0,0,0,0,0]),3),this._attrPosition.setUsage(xf);const e=new Et;e.setAttribute("position",this._attrPosition);const t=new Bi({color:16711935,depthTest:!1,depthWrite:!1});this._line=new Ao(e,t),this.add(this._line),this.constraint=i}updateMatrixWorld(i){hi.setFromMatrixPosition(this.constraint.destination.matrixWorld),this._attrPosition.setXYZ(0,hi.x,hi.y,hi.z),this.constraint.source&&hi.setFromMatrixPosition(this.constraint.source.matrixWorld),this._attrPosition.setXYZ(1,hi.x,hi.y,hi.z),this._attrPosition.needsUpdate=!0,super.updateMatrixWorld(i)}};function ju(i,e){return e.set(i.elements[12],i.elements[13],i.elements[14])}var IM=new C,NM=new C;function DM(i,e){return i.decompose(IM,e,NM),e}function Mo(i){return i.invert?i.invert():i.inverse(),i}var Gl=class{constructor(i,e){this.destination=i,this.source=e,this.weight=1}},UM=new C,OM=new C,FM=new C,BM=new Fe,kM=new Fe,VM=new Fe,HM=class extends Gl{get aimAxis(){return this._aimAxis}set aimAxis(i){this._aimAxis=i,this._v3AimAxis.set(i==="PositiveX"?1:i==="NegativeX"?-1:0,i==="PositiveY"?1:i==="NegativeY"?-1:0,i==="PositiveZ"?1:i==="NegativeZ"?-1:0)}get dependencies(){const i=new Set([this.source]);return this.destination.parent&&i.add(this.destination.parent),i}constructor(i,e){super(i,e),this._aimAxis="PositiveX",this._v3AimAxis=new C(1,0,0),this._dstRestQuat=new Fe}setInitState(){this._dstRestQuat.copy(this.destination.quaternion)}update(){this.destination.updateWorldMatrix(!0,!1),this.source.updateWorldMatrix(!0,!1);const i=BM.identity(),e=kM.identity();this.destination.parent&&(DM(this.destination.parent.matrixWorld,i),Mo(e.copy(i)));const t=UM.copy(this._v3AimAxis).applyQuaternion(this._dstRestQuat).applyQuaternion(i),n=ju(this.source.matrixWorld,OM).sub(ju(this.destination.matrixWorld,FM)).normalize(),r=VM.setFromUnitVectors(t,n).premultiply(e).multiply(i).multiply(this._dstRestQuat);this.destination.quaternion.copy(this._dstRestQuat).slerp(r,this.weight)}};function zM(i,e){const t=[i];let n=i.parent;for(;n!==null;)t.unshift(n),n=n.parent;t.forEach(r=>{e(r)})}var GM=class{constructor(){this._constraints=new Set,this._objectConstraintsMap=new Map}get constraints(){return this._constraints}addConstraint(i){this._constraints.add(i);let e=this._objectConstraintsMap.get(i.destination);e==null&&(e=new Set,this._objectConstraintsMap.set(i.destination,e)),e.add(i)}deleteConstraint(i){this._constraints.delete(i),this._objectConstraintsMap.get(i.destination).delete(i)}setInitState(){const i=new Set,e=new Set;for(const t of this._constraints)this._processConstraint(t,i,e,n=>n.setInitState())}update(){const i=new Set,e=new Set;for(const t of this._constraints)this._processConstraint(t,i,e,n=>n.update())}_processConstraint(i,e,t,n){if(t.has(i))return;if(e.has(i))throw new Error("VRMNodeConstraintManager: Circular dependency detected while updating constraints");e.add(i);const r=i.dependencies;for(const s of r)zM(s,o=>{const a=this._objectConstraintsMap.get(o);if(a)for(const l of a)this._processConstraint(l,e,t,n)});n(i),t.add(i)}},WM=new Fe,XM=new Fe,qM=class extends Gl{get dependencies(){return new Set([this.source])}constructor(i,e){super(i,e),this._dstRestQuat=new Fe,this._invSrcRestQuat=new Fe}setInitState(){this._dstRestQuat.copy(this.destination.quaternion),Mo(this._invSrcRestQuat.copy(this.source.quaternion))}update(){const i=WM.copy(this._invSrcRestQuat).multiply(this.source.quaternion),e=XM.copy(this._dstRestQuat).multiply(i);this.destination.quaternion.copy(this._dstRestQuat).slerp(e,this.weight)}},YM=new C,KM=new Fe,$M=new Fe,ZM=class extends Gl{get rollAxis(){return this._rollAxis}set rollAxis(i){this._rollAxis=i,this._v3RollAxis.set(i==="X"?1:0,i==="Y"?1:0,i==="Z"?1:0)}get dependencies(){return new Set([this.source])}constructor(i,e){super(i,e),this._rollAxis="X",this._v3RollAxis=new C(1,0,0),this._dstRestQuat=new Fe,this._invDstRestQuat=new Fe,this._invSrcRestQuatMulDstRestQuat=new Fe}setInitState(){this._dstRestQuat.copy(this.destination.quaternion),Mo(this._invDstRestQuat.copy(this._dstRestQuat)),Mo(this._invSrcRestQuatMulDstRestQuat.copy(this.source.quaternion)).multiply(this._dstRestQuat)}update(){const i=KM.copy(this._invDstRestQuat).multiply(this.source.quaternion).multiply(this._invSrcRestQuatMulDstRestQuat),e=YM.copy(this._v3RollAxis).applyQuaternion(i),n=$M.setFromUnitVectors(e,this._v3RollAxis).premultiply(this._dstRestQuat).multiply(i);this.destination.quaternion.copy(this._dstRestQuat).slerp(n,this.weight)}},JM=new Set(["1.0","1.0-beta"]),Ld=class Jr{get name(){return Jr.EXTENSION_NAME}constructor(e,t){this.parser=e,this.helperRoot=t?.helperRoot}afterRoot(e){return Qu(this,null,function*(){e.userData.vrmNodeConstraintManager=yield this._import(e)})}_import(e){return Qu(this,null,function*(){var t;const n=this.parser.json;if(!(((t=n.extensionsUsed)==null?void 0:t.indexOf(Jr.EXTENSION_NAME))!==-1))return null;const s=new GM,o=yield this.parser.getDependencies("node");return o.forEach((a,l)=>{var c;const u=n.nodes[l],h=(c=u?.extensions)==null?void 0:c[Jr.EXTENSION_NAME];if(h==null)return;const d=h.specVersion;if(!JM.has(d)){console.warn(`VRMNodeConstraintLoaderPlugin: Unknown ${Jr.EXTENSION_NAME} specVersion "${d}"`);return}const f=h.constraint;if(f.roll!=null){const g=this._importRollConstraint(a,o,f.roll);s.addConstraint(g)}else if(f.aim!=null){const g=this._importAimConstraint(a,o,f.aim);s.addConstraint(g)}else if(f.rotation!=null){const g=this._importRotationConstraint(a,o,f.rotation);s.addConstraint(g)}}),e.scene.updateMatrixWorld(),s.setInitState(),s})}_importRollConstraint(e,t,n){const{source:r,rollAxis:s,weight:o}=n,a=t[r],l=new ZM(e,a);if(s!=null&&(l.rollAxis=s),o!=null&&(l.weight=o),this.helperRoot){const c=new ma(l);this.helperRoot.add(c)}return l}_importAimConstraint(e,t,n){const{source:r,aimAxis:s,weight:o}=n,a=t[r],l=new HM(e,a);if(s!=null&&(l.aimAxis=s),o!=null&&(l.weight=o),this.helperRoot){const c=new ma(l);this.helperRoot.add(c)}return l}_importRotationConstraint(e,t,n){const{source:r,weight:s}=n,o=t[r],a=new qM(e,o);if(s!=null&&(a.weight=s),this.helperRoot){const l=new ma(a);this.helperRoot.add(l)}return a}};Ld.EXTENSION_NAME="VRMC_node_constraint";var QM=Ld,Js=(i,e,t)=>new Promise((n,r)=>{var s=l=>{try{a(t.next(l))}catch(c){r(c)}},o=l=>{try{a(t.throw(l))}catch(c){r(c)}},a=l=>l.done?n(l.value):Promise.resolve(l.value).then(s,o);a((t=t.apply(i,e)).next())}),Wl=class{},ga=new C,Ii=new C,Id=class extends Wl{get type(){return"capsule"}constructor(i){var e,t,n,r;super(),this.offset=(e=i?.offset)!=null?e:new C(0,0,0),this.tail=(t=i?.tail)!=null?t:new C(0,0,0),this.radius=(n=i?.radius)!=null?n:0,this.inside=(r=i?.inside)!=null?r:!1}calculateCollision(i,e,t,n){ga.setFromMatrixPosition(i),Ii.subVectors(this.tail,this.offset).applyMatrix4(i),Ii.sub(ga);const r=Ii.lengthSq();n.copy(e).sub(ga);const s=Ii.dot(n);s<=0||(r<=s||Ii.multiplyScalar(s/r),n.sub(Ii));const o=n.length(),a=this.inside?this.radius-t-o:o-t-this.radius;return a<0&&(n.multiplyScalar(1/o),this.inside&&n.negate()),a}},_a=new C,eh=new Oe,Nd=class extends Wl{get type(){return"plane"}constructor(i){var e,t;super(),this.offset=(e=i?.offset)!=null?e:new C(0,0,0),this.normal=(t=i?.normal)!=null?t:new C(0,0,1)}calculateCollision(i,e,t,n){n.setFromMatrixPosition(i),n.negate().add(e),eh.getNormalMatrix(i),_a.copy(this.normal).applyNormalMatrix(eh).normalize();const r=n.dot(_a)-t;return n.copy(_a),r}},jM=new C,Dd=class extends Wl{get type(){return"sphere"}constructor(i){var e,t,n;super(),this.offset=(e=i?.offset)!=null?e:new C(0,0,0),this.radius=(t=i?.radius)!=null?t:0,this.inside=(n=i?.inside)!=null?n:!1}calculateCollision(i,e,t,n){n.subVectors(e,jM.setFromMatrixPosition(i));const r=n.length(),s=this.inside?this.radius-t-r:r-t-this.radius;return s<0&&(n.multiplyScalar(1/r),this.inside&&n.negate()),s}},Ln=new C,e1=class extends Et{constructor(i){super(),this.worldScale=1,this._currentRadius=0,this._currentOffset=new C,this._currentTail=new C,this._shape=i,this._attrPos=new vt(new Float32Array(396),3),this.setAttribute("position",this._attrPos),this._attrIndex=new vt(new Uint16Array(264),1),this.setIndex(this._attrIndex),this._buildIndex(),this.update()}update(){let i=!1;const e=this._shape.radius/this.worldScale;this._currentRadius!==e&&(this._currentRadius=e,i=!0),this._currentOffset.equals(this._shape.offset)||(this._currentOffset.copy(this._shape.offset),i=!0);const t=Ln.copy(this._shape.tail).divideScalar(this.worldScale);this._currentTail.distanceToSquared(t)>1e-10&&(this._currentTail.copy(t),i=!0),i&&this._buildPosition()}_buildPosition(){Ln.copy(this._currentTail).sub(this._currentOffset);const i=Ln.length()/this._currentRadius;for(let n=0;n<=16;n++){const r=n/16*Math.PI;this._attrPos.setXYZ(n,-Math.sin(r),-Math.cos(r),0),this._attrPos.setXYZ(17+n,i+Math.sin(r),Math.cos(r),0),this._attrPos.setXYZ(34+n,-Math.sin(r),0,-Math.cos(r)),this._attrPos.setXYZ(51+n,i+Math.sin(r),0,Math.cos(r))}for(let n=0;n<32;n++){const r=n/16*Math.PI;this._attrPos.setXYZ(68+n,0,Math.sin(r),Math.cos(r)),this._attrPos.setXYZ(100+n,i,Math.sin(r),Math.cos(r))}const e=Math.atan2(Ln.y,Math.sqrt(Ln.x*Ln.x+Ln.z*Ln.z)),t=-Math.atan2(Ln.z,Ln.x);this.rotateZ(e),this.rotateY(t),this.scale(this._currentRadius,this._currentRadius,this._currentRadius),this.translate(this._currentOffset.x,this._currentOffset.y,this._currentOffset.z),this._attrPos.needsUpdate=!0}_buildIndex(){for(let i=0;i<34;i++){const e=(i+1)%34;this._attrIndex.setXY(i*2,i,e),this._attrIndex.setXY(68+i*2,34+i,34+e)}for(let i=0;i<32;i++){const e=(i+1)%32;this._attrIndex.setXY(136+i*2,68+i,68+e),this._attrIndex.setXY(200+i*2,100+i,100+e)}this._attrIndex.needsUpdate=!0}},t1=class extends Et{constructor(i){super(),this.worldScale=1,this._currentOffset=new C,this._currentNormal=new C,this._shape=i,this._attrPos=new vt(new Float32Array(18),3),this.setAttribute("position",this._attrPos),this._attrIndex=new vt(new Uint16Array(10),1),this.setIndex(this._attrIndex),this._buildIndex(),this.update()}update(){let i=!1;this._currentOffset.equals(this._shape.offset)||(this._currentOffset.copy(this._shape.offset),i=!0),this._currentNormal.equals(this._shape.normal)||(this._currentNormal.copy(this._shape.normal),i=!0),i&&this._buildPosition()}_buildPosition(){this._attrPos.setXYZ(0,-.5,-.5,0),this._attrPos.setXYZ(1,.5,-.5,0),this._attrPos.setXYZ(2,.5,.5,0),this._attrPos.setXYZ(3,-.5,.5,0),this._attrPos.setXYZ(4,0,0,0),this._attrPos.setXYZ(5,0,0,.25),this.translate(this._currentOffset.x,this._currentOffset.y,this._currentOffset.z),this.lookAt(this._currentNormal),this._attrPos.needsUpdate=!0}_buildIndex(){this._attrIndex.setXY(0,0,1),this._attrIndex.setXY(2,1,2),this._attrIndex.setXY(4,2,3),this._attrIndex.setXY(6,3,0),this._attrIndex.setXY(8,4,5),this._attrIndex.needsUpdate=!0}},n1=class extends Et{constructor(i){super(),this.worldScale=1,this._currentRadius=0,this._currentOffset=new C,this._shape=i,this._attrPos=new vt(new Float32Array(288),3),this.setAttribute("position",this._attrPos),this._attrIndex=new vt(new Uint16Array(192),1),this.setIndex(this._attrIndex),this._buildIndex(),this.update()}update(){let i=!1;const e=this._shape.radius/this.worldScale;this._currentRadius!==e&&(this._currentRadius=e,i=!0),this._currentOffset.equals(this._shape.offset)||(this._currentOffset.copy(this._shape.offset),i=!0),i&&this._buildPosition()}_buildPosition(){for(let i=0;i<32;i++){const e=i/16*Math.PI;this._attrPos.setXYZ(i,Math.cos(e),Math.sin(e),0),this._attrPos.setXYZ(32+i,0,Math.cos(e),Math.sin(e)),this._attrPos.setXYZ(64+i,Math.sin(e),0,Math.cos(e))}this.scale(this._currentRadius,this._currentRadius,this._currentRadius),this.translate(this._currentOffset.x,this._currentOffset.y,this._currentOffset.z),this._attrPos.needsUpdate=!0}_buildIndex(){for(let i=0;i<32;i++){const e=(i+1)%32;this._attrIndex.setXY(i*2,i,e),this._attrIndex.setXY(64+i*2,32+i,32+e),this._attrIndex.setXY(128+i*2,64+i,64+e)}this._attrIndex.needsUpdate=!0}},i1=new C,va=class extends $t{constructor(i){if(super(),this.matrixAutoUpdate=!1,this.collider=i,this.collider.shape instanceof Dd)this._geometry=new n1(this.collider.shape);else if(this.collider.shape instanceof Id)this._geometry=new e1(this.collider.shape);else if(this.collider.shape instanceof Nd)this._geometry=new t1(this.collider.shape);else throw new Error("VRMSpringBoneColliderHelper: Unknown collider shape type detected");const e=new Bi({color:16711935,depthTest:!1,depthWrite:!1});this._line=new gs(this._geometry,e),this.add(this._line)}dispose(){this._geometry.dispose()}updateMatrixWorld(i){this.collider.updateWorldMatrix(!0,!1),this.matrix.copy(this.collider.matrixWorld);const e=this.matrix.elements;this._geometry.worldScale=i1.set(e[0],e[1],e[2]).length(),this._geometry.update(),super.updateMatrixWorld(i)}},r1=class extends Et{constructor(i){super(),this.worldScale=1,this._currentRadius=0,this._currentTail=new C,this._springBone=i,this._attrPos=new vt(new Float32Array(294),3),this.setAttribute("position",this._attrPos),this._attrIndex=new vt(new Uint16Array(194),1),this.setIndex(this._attrIndex),this._buildIndex(),this.update()}update(){let i=!1;const e=this._springBone.settings.hitRadius/this.worldScale;this._currentRadius!==e&&(this._currentRadius=e,i=!0),this._currentTail.equals(this._springBone.initialLocalChildPosition)||(this._currentTail.copy(this._springBone.initialLocalChildPosition),i=!0),i&&this._buildPosition()}_buildPosition(){for(let i=0;i<32;i++){const e=i/16*Math.PI;this._attrPos.setXYZ(i,Math.cos(e),Math.sin(e),0),this._attrPos.setXYZ(32+i,0,Math.cos(e),Math.sin(e)),this._attrPos.setXYZ(64+i,Math.sin(e),0,Math.cos(e))}this.scale(this._currentRadius,this._currentRadius,this._currentRadius),this.translate(this._currentTail.x,this._currentTail.y,this._currentTail.z),this._attrPos.setXYZ(96,0,0,0),this._attrPos.setXYZ(97,this._currentTail.x,this._currentTail.y,this._currentTail.z),this._attrPos.needsUpdate=!0}_buildIndex(){for(let i=0;i<32;i++){const e=(i+1)%32;this._attrIndex.setXY(i*2,i,e),this._attrIndex.setXY(64+i*2,32+i,32+e),this._attrIndex.setXY(128+i*2,64+i,64+e)}this._attrIndex.setXY(192,96,97),this._attrIndex.needsUpdate=!0}},s1=new C,o1=class extends $t{constructor(i){super(),this.matrixAutoUpdate=!1,this.springBone=i,this._geometry=new r1(this.springBone);const e=new Bi({color:16776960,depthTest:!1,depthWrite:!1});this._line=new gs(this._geometry,e),this.add(this._line)}dispose(){this._geometry.dispose()}updateMatrixWorld(i){this.springBone.bone.updateWorldMatrix(!0,!1),this.matrix.copy(this.springBone.bone.matrixWorld);const e=this.matrix.elements;this._geometry.worldScale=s1.set(e[0],e[1],e[2]).length(),this._geometry.update(),super.updateMatrixWorld(i)}},xa=class extends ft{constructor(i){super(),this.colliderMatrix=new Ve,this.shape=i}updateWorldMatrix(i,e){super.updateWorldMatrix(i,e),a1(this.colliderMatrix,this.matrixWorld,this.shape.offset)}};function a1(i,e,t){const n=e.elements;i.copy(e),t&&(i.elements[12]=n[0]*t.x+n[4]*t.y+n[8]*t.z+n[12],i.elements[13]=n[1]*t.x+n[5]*t.y+n[9]*t.z+n[13],i.elements[14]=n[2]*t.x+n[6]*t.y+n[10]*t.z+n[14])}var l1=new Ve;function c1(i){return i.invert?i.invert():i.getInverse(l1.copy(i)),i}var u1=class{constructor(i){this._inverseCache=new Ve,this._shouldUpdateInverse=!0,this.matrix=i;const e={set:(t,n,r)=>(this._shouldUpdateInverse=!0,t[n]=r,!0)};this._originalElements=i.elements,i.elements=new Proxy(i.elements,e)}get inverse(){return this._shouldUpdateInverse&&(c1(this._inverseCache.copy(this.matrix)),this._shouldUpdateInverse=!1),this._inverseCache}revert(){this.matrix.elements=this._originalElements}},Ma=new Ve,sr=new C,Gr=new C,Wr=new C,Xr=new C,h1=new Ve,d1=class{constructor(i,e,t={},n=[]){this._currentTail=new C,this._prevTail=new C,this._boneAxis=new C,this._worldSpaceBoneLength=0,this._center=null,this._initialLocalMatrix=new Ve,this._initialLocalRotation=new Fe,this._initialLocalChildPosition=new C;var r,s,o,a,l,c;this.bone=i,this.bone.matrixAutoUpdate=!1,this.child=e,this.settings={hitRadius:(r=t.hitRadius)!=null?r:0,stiffness:(s=t.stiffness)!=null?s:1,gravityPower:(o=t.gravityPower)!=null?o:0,gravityDir:(l=(a=t.gravityDir)==null?void 0:a.clone())!=null?l:new C(0,-1,0),dragForce:(c=t.dragForce)!=null?c:.4},this.colliderGroups=n}get dependencies(){const i=new Set,e=this.bone.parent;e&&i.add(e);for(let t=0;t<this.colliderGroups.length;t++)for(let n=0;n<this.colliderGroups[t].colliders.length;n++)i.add(this.colliderGroups[t].colliders[n]);return i}get center(){return this._center}set center(i){var e;(e=this._center)!=null&&e.userData.inverseCacheProxy&&(this._center.userData.inverseCacheProxy.revert(),delete this._center.userData.inverseCacheProxy),this._center=i,this._center&&(this._center.userData.inverseCacheProxy||(this._center.userData.inverseCacheProxy=new u1(this._center.matrixWorld)))}get initialLocalChildPosition(){return this._initialLocalChildPosition}get _parentMatrixWorld(){return this.bone.parent?this.bone.parent.matrixWorld:Ma}setInitState(){this._initialLocalMatrix.copy(this.bone.matrix),this._initialLocalRotation.copy(this.bone.quaternion),this.child?this._initialLocalChildPosition.copy(this.child.position):this._initialLocalChildPosition.copy(this.bone.position).normalize().multiplyScalar(.07);const i=this._getMatrixWorldToCenter();this.bone.localToWorld(this._currentTail.copy(this._initialLocalChildPosition)).applyMatrix4(i),this._prevTail.copy(this._currentTail),this._boneAxis.copy(this._initialLocalChildPosition).normalize()}reset(){this.bone.quaternion.copy(this._initialLocalRotation),this.bone.updateMatrix(),this.bone.matrixWorld.multiplyMatrices(this._parentMatrixWorld,this.bone.matrix);const i=this._getMatrixWorldToCenter();this.bone.localToWorld(this._currentTail.copy(this._initialLocalChildPosition)).applyMatrix4(i),this._prevTail.copy(this._currentTail)}update(i){if(i<=0)return;this._calcWorldSpaceBoneLength();const e=Gr.copy(this._boneAxis).transformDirection(this._initialLocalMatrix).transformDirection(this._parentMatrixWorld);Xr.copy(this._currentTail).add(sr.subVectors(this._currentTail,this._prevTail).multiplyScalar(1-this.settings.dragForce)).applyMatrix4(this._getMatrixCenterToWorld()).addScaledVector(e,this.settings.stiffness*i).addScaledVector(this.settings.gravityDir,this.settings.gravityPower*i),Wr.setFromMatrixPosition(this.bone.matrixWorld),Xr.sub(Wr).normalize().multiplyScalar(this._worldSpaceBoneLength).add(Wr),this._collision(Xr),this._prevTail.copy(this._currentTail),this._currentTail.copy(Xr).applyMatrix4(this._getMatrixWorldToCenter());const t=h1.multiplyMatrices(this._parentMatrixWorld,this._initialLocalMatrix).invert();this.bone.quaternion.setFromUnitVectors(this._boneAxis,sr.copy(Xr).applyMatrix4(t).normalize()).premultiply(this._initialLocalRotation),this.bone.updateMatrix(),this.bone.matrixWorld.multiplyMatrices(this._parentMatrixWorld,this.bone.matrix)}_collision(i){for(let e=0;e<this.colliderGroups.length;e++)for(let t=0;t<this.colliderGroups[e].colliders.length;t++){const n=this.colliderGroups[e].colliders[t],r=n.shape.calculateCollision(n.colliderMatrix,i,this.settings.hitRadius,sr);if(r<0){i.addScaledVector(sr,-r),i.sub(Wr);const s=i.length();i.multiplyScalar(this._worldSpaceBoneLength/s).add(Wr)}}}_calcWorldSpaceBoneLength(){sr.setFromMatrixPosition(this.bone.matrixWorld),this.child?Gr.setFromMatrixPosition(this.child.matrixWorld):(Gr.copy(this._initialLocalChildPosition),Gr.applyMatrix4(this.bone.matrixWorld)),this._worldSpaceBoneLength=sr.sub(Gr).length()}_getMatrixCenterToWorld(){return this._center?this._center.matrixWorld:Ma}_getMatrixWorldToCenter(){return this._center?this._center.userData.inverseCacheProxy.inverse:Ma}};function f1(i,e){const t=[];let n=i;for(;n!==null;)t.unshift(n),n=n.parent;t.forEach(r=>{e(r)})}function xl(i,e){i.children.forEach(t=>{e(t)||xl(t,e)})}function p1(i){var e;const t=new Map;for(const n of i){let r=n;do{const s=((e=t.get(r))!=null?e:0)+1;if(s===i.size)return r;t.set(r,s),r=r.parent}while(r!==null)}return null}var th=class{constructor(){this._joints=new Set,this._sortedJoints=[],this._hasWarnedCircularDependency=!1,this._ancestors=[],this._objectSpringBonesMap=new Map,this._isSortedJointsDirty=!1,this._relevantChildrenUpdated=this._relevantChildrenUpdated.bind(this)}get joints(){return this._joints}get springBones(){return console.warn("VRMSpringBoneManager: springBones is deprecated. use joints instead."),this._joints}get colliderGroups(){const i=new Set;return this._joints.forEach(e=>{e.colliderGroups.forEach(t=>{i.add(t)})}),Array.from(i)}get colliders(){const i=new Set;return this.colliderGroups.forEach(e=>{e.colliders.forEach(t=>{i.add(t)})}),Array.from(i)}addJoint(i){this._joints.add(i);let e=this._objectSpringBonesMap.get(i.bone);e==null&&(e=new Set,this._objectSpringBonesMap.set(i.bone,e)),e.add(i),this._isSortedJointsDirty=!0}addSpringBone(i){console.warn("VRMSpringBoneManager: addSpringBone() is deprecated. use addJoint() instead."),this.addJoint(i)}deleteJoint(i){this._joints.delete(i),this._objectSpringBonesMap.get(i.bone).delete(i),this._isSortedJointsDirty=!0}deleteSpringBone(i){console.warn("VRMSpringBoneManager: deleteSpringBone() is deprecated. use deleteJoint() instead."),this.deleteJoint(i)}setInitState(){this._sortJoints();for(let i=0;i<this._sortedJoints.length;i++){const e=this._sortedJoints[i];e.bone.updateMatrix(),e.bone.updateWorldMatrix(!1,!1),e.setInitState()}}reset(){this._sortJoints();for(let i=0;i<this._sortedJoints.length;i++){const e=this._sortedJoints[i];e.bone.updateMatrix(),e.bone.updateWorldMatrix(!1,!1),e.reset()}}update(i){this._sortJoints();for(let e=0;e<this._ancestors.length;e++)this._ancestors[e].updateWorldMatrix(e===0,!1);for(let e=0;e<this._sortedJoints.length;e++){const t=this._sortedJoints[e];t.bone.updateMatrix(),t.bone.updateWorldMatrix(!1,!1),t.update(i),xl(t.bone,this._relevantChildrenUpdated)}}_sortJoints(){if(!this._isSortedJointsDirty)return;const i=[],e=new Set,t=new Set,n=new Set;for(const s of this._joints)this._insertJointSort(s,e,t,i,n);this._sortedJoints=i;const r=p1(n);this._ancestors=[],r&&(this._ancestors.push(r),xl(r,s=>{var o,a;return((a=(o=this._objectSpringBonesMap.get(s))==null?void 0:o.size)!=null?a:0)>0?!0:(this._ancestors.push(s),!1)})),this._isSortedJointsDirty=!1}_insertJointSort(i,e,t,n,r){if(t.has(i))return;if(e.has(i)){this._hasWarnedCircularDependency||(console.warn("VRMSpringBoneManager: Circular dependency detected"),this._hasWarnedCircularDependency=!0);return}e.add(i);const s=i.dependencies;for(const o of s){let a=!1,l=null;f1(o,c=>{const u=this._objectSpringBonesMap.get(c);if(u)for(const h of u)a=!0,this._insertJointSort(h,e,t,n,r);else a||(l=c)}),l&&r.add(l)}n.push(i),t.add(i)}_relevantChildrenUpdated(i){var e,t;return((t=(e=this._objectSpringBonesMap.get(i))==null?void 0:e.size)!=null?t:0)>0?!0:(i.updateWorldMatrix(!1,!1),!1)}},nh="VRMC_springBone_extended_collider",m1=new Set(["1.0","1.0-beta"]),g1=new Set(["1.0"]),Ud=class cr{get name(){return cr.EXTENSION_NAME}constructor(e,t){var n;this.parser=e,this.jointHelperRoot=t?.jointHelperRoot,this.colliderHelperRoot=t?.colliderHelperRoot,this.useExtendedColliders=(n=t?.useExtendedColliders)!=null?n:!0}afterRoot(e){return Js(this,null,function*(){e.userData.vrmSpringBoneManager=yield this._import(e)})}_import(e){return Js(this,null,function*(){const t=yield this._v1Import(e);if(t!=null)return t;const n=yield this._v0Import(e);return n??null})}_v1Import(e){return Js(this,null,function*(){var t,n,r,s,o;const a=e.parser.json;if(!(((t=a.extensionsUsed)==null?void 0:t.indexOf(cr.EXTENSION_NAME))!==-1))return null;const c=new th,u=yield e.parser.getDependencies("node"),h=(n=a.extensions)==null?void 0:n[cr.EXTENSION_NAME];if(!h)return null;const d=h.specVersion;if(!m1.has(d))return console.warn(`VRMSpringBoneLoaderPlugin: Unknown ${cr.EXTENSION_NAME} specVersion "${d}"`),null;const f=(r=h.colliders)==null?void 0:r.map((v,p)=>{var m,x,A,y,b,E,_,S,D,R,N,O,W,L,G;const z=u[v.node];if(z==null)return console.warn(`VRMSpringBoneLoaderPlugin: The collider #${p} attempted to reference a node #${v.node} but not found. Skipping the collider`),null;const B=v.shape,ee=(m=v.extensions)==null?void 0:m[nh];if(this.useExtendedColliders&&ee!=null){const Y=ee.specVersion;if(!g1.has(Y))console.warn(`VRMSpringBoneLoaderPlugin: Unknown ${nh} specVersion "${Y}". Fallbacking to the ${cr.EXTENSION_NAME} definition`);else{const Z=ee.shape;if(Z.sphere)return this._importSphereCollider(z,{offset:new C().fromArray((x=Z.sphere.offset)!=null?x:[0,0,0]),radius:(A=Z.sphere.radius)!=null?A:0,inside:(y=Z.sphere.inside)!=null?y:!1});if(Z.capsule)return this._importCapsuleCollider(z,{offset:new C().fromArray((b=Z.capsule.offset)!=null?b:[0,0,0]),radius:(E=Z.capsule.radius)!=null?E:0,tail:new C().fromArray((_=Z.capsule.tail)!=null?_:[0,0,0]),inside:(S=Z.capsule.inside)!=null?S:!1});if(Z.plane)return this._importPlaneCollider(z,{offset:new C().fromArray((D=Z.plane.offset)!=null?D:[0,0,0]),normal:new C().fromArray((R=Z.plane.normal)!=null?R:[0,0,1])})}}if(B.sphere)return this._importSphereCollider(z,{offset:new C().fromArray((N=B.sphere.offset)!=null?N:[0,0,0]),radius:(O=B.sphere.radius)!=null?O:0,inside:!1});if(B.capsule)return this._importCapsuleCollider(z,{offset:new C().fromArray((W=B.capsule.offset)!=null?W:[0,0,0]),radius:(L=B.capsule.radius)!=null?L:0,tail:new C().fromArray((G=B.capsule.tail)!=null?G:[0,0,0]),inside:!1});console.warn(`VRMSpringBoneLoaderPlugin: The collider #${p} has no valid shape. Skipping the collider`)}),g=(s=h.colliderGroups)==null?void 0:s.map((v,p)=>{var m;return{colliders:((m=v.colliders)!=null?m:[]).map(A=>{const y=f?.[A];return y??(console.warn(`VRMSpringBoneLoaderPlugin: The collider group #${p} attempted to reference a collider #${A} but not found. Skipping the collider`),null)}).filter(A=>A!=null),name:v.name}});return(o=h.springs)==null||o.forEach((v,p)=>{var m;const x=v.joints,A=(m=v.colliderGroups)==null?void 0:m.map(E=>{const _=g?.[E];return _??(console.warn(`VRMSpringBoneLoaderPlugin: The spring #${p} attempted to reference a collider group #${E} but not found. Skipping the collider group`),null)}).filter(E=>E!=null),y=v.center!=null?u[v.center]:void 0;let b;x.forEach(E=>{if(b){const _=b.node,S=u[_],D=E.node,R=u[D],N={hitRadius:b.hitRadius,dragForce:b.dragForce,gravityPower:b.gravityPower,stiffness:b.stiffness,gravityDir:b.gravityDir!=null?new C().fromArray(b.gravityDir):void 0},O=this._importJoint(S,R,N,A);y&&(O.center=y),c.addJoint(O)}b=E})}),c.setInitState(),c})}_v0Import(e){return Js(this,null,function*(){var t,n,r;const s=e.parser.json;if(!(((t=s.extensionsUsed)==null?void 0:t.indexOf("VRM"))!==-1))return null;const a=(n=s.extensions)==null?void 0:n.VRM,l=a?.secondaryAnimation;if(!l)return null;const c=l?.boneGroups;if(!c)return null;const u=new th,h=yield e.parser.getDependencies("node"),d=(r=l.colliderGroups)==null?void 0:r.map((f,g)=>{var v;const p=h[f.node];return p==null?(console.warn(`VRMSpringBoneLoaderPlugin: The collider group #${g} attempted to reference a node #${f.node} but not found. Skipping the collider group`),null):{colliders:((v=f.colliders)!=null?v:[]).map((x,A)=>{var y,b,E;const _=new C(0,0,0);return x.offset&&_.set((y=x.offset.x)!=null?y:0,(b=x.offset.y)!=null?b:0,x.offset.z?-x.offset.z:0),this._importSphereCollider(p,{offset:_,radius:(E=x.radius)!=null?E:0,inside:!1})})}});return c?.forEach((f,g)=>{const v=f.bones;v&&v.forEach(p=>{var m,x,A,y;const b=h[p];if(b==null){console.warn(`VRMSpringBoneLoaderPlugin: The spring bone group #${g} attempted to reference a node #${p} but not found. Skipping the node`);return}const E=new C;f.gravityDir?E.set((m=f.gravityDir.x)!=null?m:0,(x=f.gravityDir.y)!=null?x:0,(A=f.gravityDir.z)!=null?A:0):E.set(0,-1,0);const _=f.center!=null?h[f.center]:void 0,S={hitRadius:f.hitRadius,dragForce:f.dragForce,gravityPower:f.gravityPower,stiffness:f.stiffiness,gravityDir:E},D=(y=f.colliderGroups)==null?void 0:y.map(R=>{const N=d?.[R];return N??(console.warn(`VRMSpringBoneLoaderPlugin: The spring #${g} attempted to reference a collider group #${R} but not found. Skipping the collider group`),null)}).filter(R=>R!=null);b.traverse(R=>{var N;const O=(N=R.children[0])!=null?N:null,W=this._importJoint(R,O,S,D);_&&(W.center=_),u.addJoint(W)})})}),e.scene.updateMatrixWorld(),u.setInitState(),u})}_importJoint(e,t,n,r){const s=new d1(e,t,n,r);if(this.jointHelperRoot){const o=new o1(s);this.jointHelperRoot.add(o),o.renderOrder=this.jointHelperRoot.renderOrder}return s}_importSphereCollider(e,t){const n=new Dd(t),r=new xa(n);if(e.add(r),this.colliderHelperRoot){const s=new va(r);this.colliderHelperRoot.add(s),s.renderOrder=this.colliderHelperRoot.renderOrder}return r}_importCapsuleCollider(e,t){const n=new Id(t),r=new xa(n);if(e.add(r),this.colliderHelperRoot){const s=new va(r);this.colliderHelperRoot.add(s),s.renderOrder=this.colliderHelperRoot.renderOrder}return r}_importPlaneCollider(e,t){const n=new Nd(t),r=new xa(n);if(e.add(r),this.colliderHelperRoot){const s=new va(r);this.colliderHelperRoot.add(s),s.renderOrder=this.colliderHelperRoot.renderOrder}return r}};Ud.EXTENSION_NAME="VRMC_springBone";var _1=Ud,v1=class{get name(){return"VRMLoaderPlugin"}constructor(i,e){var t,n,r,s,o,a,l,c,u,h;this.parser=i;const d=e?.helperRoot,f=e?.autoUpdateHumanBones;this.expressionPlugin=(t=e?.expressionPlugin)!=null?t:new Dx(i),this.firstPersonPlugin=(n=e?.firstPersonPlugin)!=null?n:new Ox(i),this.humanoidPlugin=(r=e?.humanoidPlugin)!=null?r:new Gx(i,{helperRoot:d,autoUpdateHumanBones:f}),this.lookAtPlugin=(s=e?.lookAtPlugin)!=null?s:new rM(i,{helperRoot:d}),this.metaPlugin=(o=e?.metaPlugin)!=null?o:new aM(i),this.mtoonMaterialPlugin=(a=e?.mtoonMaterialPlugin)!=null?a:new yM(i),this.materialsHDREmissiveMultiplierPlugin=(l=e?.materialsHDREmissiveMultiplierPlugin)!=null?l:new EM(i),this.materialsV0CompatPlugin=(c=e?.materialsV0CompatPlugin)!=null?c:new LM(i),this.springBonePlugin=(u=e?.springBonePlugin)!=null?u:new _1(i,{colliderHelperRoot:d,jointHelperRoot:d}),this.nodeConstraintPlugin=(h=e?.nodeConstraintPlugin)!=null?h:new QM(i,{helperRoot:d})}beforeRoot(){return Ks(this,null,function*(){yield this.materialsV0CompatPlugin.beforeRoot(),yield this.mtoonMaterialPlugin.beforeRoot()})}loadMesh(i){return Ks(this,null,function*(){return yield this.mtoonMaterialPlugin.loadMesh(i)})}getMaterialType(i){const e=this.mtoonMaterialPlugin.getMaterialType(i);return e??null}extendMaterialParams(i,e){return Ks(this,null,function*(){yield this.materialsHDREmissiveMultiplierPlugin.extendMaterialParams(i,e),yield this.mtoonMaterialPlugin.extendMaterialParams(i,e)})}afterRoot(i){return Ks(this,null,function*(){yield this.metaPlugin.afterRoot(i),yield this.humanoidPlugin.afterRoot(i),yield this.expressionPlugin.afterRoot(i),yield this.lookAtPlugin.afterRoot(i),yield this.firstPersonPlugin.afterRoot(i),yield this.springBonePlugin.afterRoot(i),yield this.nodeConstraintPlugin.afterRoot(i),yield this.mtoonMaterialPlugin.afterRoot(i);const e=i.userData.vrmMeta,t=i.userData.vrmHumanoid;if(e&&t){const n=new cM({scene:i.scene,expressionManager:i.userData.vrmExpressionManager,firstPerson:i.userData.vrmFirstPerson,humanoid:t,lookAt:i.userData.vrmLookAt,meta:e,materials:i.userData.vrmMToonMaterials,springBoneManager:i.userData.vrmSpringBoneManager,nodeConstraintManager:i.userData.vrmNodeConstraintManager});i.userData.vrm=n}})}};function x1(i){const e=new Set;return i.traverse(t=>{if(!t.isMesh)return;const n=t;e.add(n)}),e}function ih(i,e,t){if(e.size===1){const o=e.values().next().value;if(o.weight===1)return i[o.index]}const n=new Float32Array(i[0].count*3);let r=0;if(t)r=1;else for(const o of e)r+=o.weight;for(const o of e){const a=i[o.index],l=o.weight/r;for(let c=0;c<a.count;c++)n[c*3+0]+=a.getX(c)*l,n[c*3+1]+=a.getY(c)*l,n[c*3+2]+=a.getZ(c)*l}return new vt(n,3)}function M1(i){var e;const t=x1(i.scene),n=new Map,r=(e=i.expressionManager)==null?void 0:e.expressionMap;if(r!=null)for(const[s,o]of Object.entries(r)){const a=new Set;for(const l of o.binds)if(l instanceof xo){if(l.weight!==0)for(const c of l.primitives){let u=n.get(c);u==null&&(u=new Map,n.set(c,u));let h=u.get(s);h==null&&(h=new Set,u.set(s,h)),h.add(l)}a.add(l)}for(const l of a)o.deleteBind(l)}for(const s of t){const o=n.get(s);if(o==null)continue;const a=s.geometry.morphAttributes;s.geometry.morphAttributes={};const l=s.geometry.clone();s.geometry=l;const c=l.morphTargetsRelative,u=a.position!=null,h=a.normal!=null,d={},f={},g=[];if(u||h){u&&(d.position=[]),h&&(d.normal=[]);let v=0;for(const[p,m]of o)u&&(d.position[v]=ih(a.position,m,c)),h&&(d.normal[v]=ih(a.normal,m,c)),r?.[p].addBind(new xo({index:v,weight:1,primitives:[s]})),f[p]=v,g.push(0),v++}l.morphAttributes=d,s.morphTargetDictionary=f,s.morphTargetInfluences=g}}function So(i,e,t){if(i.getComponent)return i.getComponent(e,t);{let n=i.array[e*i.itemSize+t];return i.normalized&&(n=ut.denormalize(n,i.array)),n}}function Od(i,e,t,n){i.setComponent?i.setComponent(e,t,n):(i.normalized&&(n=ut.normalize(n,i.array)),i.array[e*i.itemSize+t]=n)}function S1(i){var e;const t=y1(i),n=new Set;for(const h of t)n.has(h.geometry)&&(h.geometry=R1(h.geometry)),n.add(h.geometry);const r=new Map;for(const h of n){const d=h.getAttribute("skinIndex"),f=(e=r.get(d))!=null?e:new Map;r.set(d,f);const g=h.getAttribute("skinWeight"),v=T1(d,g);f.set(g,v)}const s=new Map;for(const h of t){const d=E1(h,r);s.set(h,d)}const o=[];for(const[h,d]of s){let f=!1;for(const g of o)if(b1(d,g.boneInverseMap)){f=!0,g.meshes.add(h);for(const[p,m]of d)g.boneInverseMap.set(p,m);break}f||o.push({boneInverseMap:d,meshes:new Set([h])})}const a=new Map,l=new Sa,c=new Sa,u=new Sa;for(const h of o){const{boneInverseMap:d,meshes:f}=h,g=Array.from(d.keys()),v=Array.from(d.values()),p=new yr(g,v),m=c.getOrCreate(p);for(const x of f){const A=x.geometry.getAttribute("skinIndex"),y=l.getOrCreate(A),b=x.skeleton.bones,E=b.map(D=>u.getOrCreate(D)).join(","),_=`${y};${m};${E}`;let S=a.get(_);S==null&&(S=A.clone(),A1(S,b,g),a.set(_,S)),x.geometry.setAttribute("skinIndex",S)}for(const x of f)x.bind(p,new Ve)}}function y1(i){const e=new Set;return i.traverse(t=>{if(!t.isSkinnedMesh)return;const n=t;e.add(n)}),e}function T1(i,e){const t=new Set;for(let n=0;n<i.count;n++)for(let r=0;r<i.itemSize;r++){const s=So(i,n,r);So(e,n,r)!==0&&t.add(s)}return t}function E1(i,e){const t=new Map,n=i.skeleton,r=i.geometry,s=r.getAttribute("skinIndex"),o=r.getAttribute("skinWeight"),a=e.get(s),l=a?.get(o);if(!l)throw new Error("Unreachable. attributeUsedIndexSetMap does not know the skin index attribute or the skin weight attribute.");for(const c of l)t.set(n.bones[c],n.boneInverses[c]);return t}function b1(i,e){for(const[t,n]of i.entries()){const r=e.get(t);if(r!=null&&!w1(n,r))return!1}return!0}function A1(i,e,t){const n=new Map;for(const s of e)n.set(s,n.size);const r=new Map;for(const[s,o]of t.entries()){const a=n.get(o);r.set(a,s)}for(let s=0;s<i.count;s++)for(let o=0;o<i.itemSize;o++){const a=So(i,s,o),l=r.get(a);Od(i,s,o,l)}i.needsUpdate=!0}function w1(i,e,t){if(t=t||1e-4,i.elements.length!=e.elements.length)return!1;for(let n=0,r=i.elements.length;n<r;n++)if(Math.abs(i.elements[n]-e.elements[n])>t)return!1;return!0}var Sa=class{constructor(){this._objectIndexMap=new Map,this._index=0}get(i){return this._objectIndexMap.get(i)}getOrCreate(i){let e=this._objectIndexMap.get(i);return e==null&&(e=this._index,this._objectIndexMap.set(i,e),this._index++),e}};function R1(i){var e,t,n,r;const s=new Et;s.name=i.name,s.setIndex(i.index);for(const[o,a]of Object.entries(i.attributes))s.setAttribute(o,a);for(const[o,a]of Object.entries(i.morphAttributes)){const l=o;s.morphAttributes[l]=a.concat()}s.morphTargetsRelative=i.morphTargetsRelative,s.groups=[];for(const o of i.groups)s.addGroup(o.start,o.count,o.materialIndex);return s.boundingSphere=(t=(e=i.boundingSphere)==null?void 0:e.clone())!=null?t:null,s.boundingBox=(r=(n=i.boundingBox)==null?void 0:n.clone())!=null?r:null,s.drawRange.start=i.drawRange.start,s.drawRange.count=i.drawRange.count,s.userData=i.userData,s}function rh(i){if(Object.values(i).forEach(e=>{e?.isTexture&&e.dispose()}),i.isShaderMaterial){const e=i.uniforms;e&&Object.values(e).forEach(t=>{const n=t.value;n?.isTexture&&n.dispose()})}i.dispose()}function C1(i){const e=i.geometry;e&&e.dispose();const t=i.skeleton;t&&t.dispose();const n=i.material;n&&(Array.isArray(n)?n.forEach(r=>rh(r)):n&&rh(n))}function P1(i){i.traverse(C1)}function L1(i,e){var t,n;console.warn("VRMUtils.removeUnnecessaryJoints: removeUnnecessaryJoints is deprecated. Use combineSkeletons instead. combineSkeletons contributes more to the performance improvement. This function will be removed in the next major version.");const r=(t=e?.experimentalSameBoneCounts)!=null?t:!1,s=[];i.traverse(l=>{l.type==="SkinnedMesh"&&s.push(l)});const o=new Map;let a=0;for(const l of s){const u=l.geometry.getAttribute("skinIndex");if(o.has(u))continue;const h=new Map,d=new Map;for(let f=0;f<u.count;f++)for(let g=0;g<u.itemSize;g++){const v=So(u,f,g);let p=h.get(v);p==null&&(p=h.size,h.set(v,p),d.set(p,v)),Od(u,f,g,p)}u.needsUpdate=!0,o.set(u,d),a=Math.max(a,h.size)}for(const l of s){const u=l.geometry.getAttribute("skinIndex"),h=o.get(u),d=[],f=[],g=r?a:h.size;for(let p=0;p<g;p++){const m=(n=h.get(p))!=null?n:0;d.push(l.skeleton.bones[m]),f.push(l.skeleton.boneInverses[m])}const v=new yr(d,f);l.bind(v,new Ve)}}function I1(i,e){const t=i.position.count,n=new Array(t);let r=0;const s=e.array;for(let o=0;o<s.length;o++){const a=s[o];n[a]||(n[a]=!0,r++)}return{isVertexUsed:n,vertexCount:t,verticesUsed:r}}function N1(i){const e=[],t=[];let n=0;for(let r=0;r<i.length;r++)if(i[r]){const s=n++;e[r]=s,t[s]=r}return{originalIndexNewIndexMap:e,newIndexOriginalIndexMap:t}}function D1(i,e){var t,n,r,s;e.name=i.name,e.morphTargetsRelative=i.morphTargetsRelative,i.groups.forEach(o=>{e.addGroup(o.start,o.count,o.materialIndex)}),e.boundingBox=(n=(t=i.boundingBox)==null?void 0:t.clone())!=null?n:null,e.boundingSphere=(s=(r=i.boundingSphere)==null?void 0:r.clone())!=null?s:null,e.setDrawRange(i.drawRange.start,i.drawRange.count),e.userData=i.userData}function U1(i,e,t){const n=e.array,r=new n.constructor(n.length);for(let s=0;s<n.length;s++){const o=n[s];r[s]=t[o]}i.setIndex(new vt(r,e.itemSize,e.normalized))}function yo(i,e,t){const n=i.constructor,r=new n(e.length*t);let s=!0;for(let o=0;o<e.length;o++){const l=e[o]*t,c=o*t;for(let u=0;u<t;u++){const h=i[l+u];r[c+u]=h,s=s&&h===0}}return[r,s]}function O1(i){var e;const t=new Map,n=[];for(const[r,s]of Object.entries(i))if(s.isInterleavedBufferAttribute){const o=s,a=o.data,l=(e=t.get(a))!=null?e:[];t.set(a,l),l.push([r,o])}else{const o=s;n.push([r,o])}return[t,n]}function F1(i,e,t){const[n,r]=O1(e);for(const[s,o]of n){const a=s.array,{stride:l}=s,[c]=yo(a,t,l),u=new Il(c,l);u.setUsage(s.usage);for(const[h,d]of o){const{itemSize:f,offset:g,normalized:v}=d,p=new ms(u,f,g,v);i.setAttribute(h,p)}}for(const[s,o]of r){const a=o.array,{itemSize:l,normalized:c}=o,[u]=yo(a,t,l);i.setAttribute(s,new vt(u,l,c))}}function B1(i){var e;const t=new Map,n=[];for(const[r,s]of Object.entries(i)){const o=r;for(let a=0;a<s.length;a++){const l=s[a];if(l.isInterleavedBufferAttribute){const c=l,u=c.data,h=(e=t.get(u))!=null?e:[];t.set(u,h),h.push([o,a,c])}else{const c=l;n.push([o,a,c])}}}return[t,n]}function k1(i,e,t){var n,r;let s=!0;const[o,a]=B1(e),l={};for(const[c,u]of o){const h=c.array,{stride:d}=c,[f,g]=yo(h,t,d);s=s&&g;const v=new Il(f,d);v.setUsage(c.usage);for(const[p,m,x]of u){const{itemSize:A,offset:y,normalized:b}=x,E=new ms(v,A,y,b);(n=l[p])!=null||(l[p]=[]),l[p][m]=E}}for(const[c,u,h]of a){const d=h,f=d.array,{itemSize:g,normalized:v}=d,[p,m]=yo(f,t,g);s=s&&m,(r=l[c])!=null||(l[c]=[]),l[c][u]=new vt(p,g,v)}i.morphAttributes=s?{}:l}function V1(i){const e=new Map;i.traverse(t=>{if(!t.isMesh)return;const n=t,r=n.geometry,s=r.index;if(s==null)return;const o=e.get(r);if(o!=null){n.geometry=o;return}const{isVertexUsed:a,vertexCount:l,verticesUsed:c}=I1(r.attributes,s);if(c===l)return;const{originalIndexNewIndexMap:u,newIndexOriginalIndexMap:h}=N1(a),d=new Et;D1(r,d),e.set(r,d),U1(d,s,u),F1(d,r.attributes,h),k1(d,r.morphAttributes,h),n.geometry=d}),Array.from(e.keys()).forEach(t=>{t.dispose()})}function H1(i){var e;((e=i.meta)==null?void 0:e.metaVersion)==="0"&&(i.scene.rotation.y=Math.PI)}var ti=class{constructor(){}};ti.combineMorphs=M1;ti.combineSkeletons=S1;ti.deepDispose=P1;ti.removeUnnecessaryJoints=L1;ti.removeUnnecessaryVertices=V1;ti.rotateVRM0=H1;const qr=new C;function on(i,e,t,n,r,s){const o=2*Math.PI*r/4,a=Math.max(s-2*r,0),l=Math.PI/4;qr.copy(e),qr[n]=0,qr.normalize();const c=.5*o/(o+a),u=1-qr.angleTo(i)/l;return Math.sign(qr[t])===1?u*c:a/(o+a)+c+c*(1-u)}class Xl extends ki{constructor(e=1,t=1,n=1,r=2,s=.1){const o=r*2+1;if(s=Math.min(e/2,t/2,n/2,s),super(1,1,1,o,o,o),this.type="RoundedBoxGeometry",this.parameters={width:e,height:t,depth:n,segments:r,radius:s},o===1)return;const a=this.toNonIndexed();this.index=null,this.attributes.position=a.attributes.position,this.attributes.normal=a.attributes.normal,this.attributes.uv=a.attributes.uv;const l=new C,c=new C,u=new C(e,t,n).divideScalar(2).subScalar(s),h=this.attributes.position.array,d=this.attributes.normal.array,f=this.attributes.uv.array,g=h.length/6,v=new C,p=.5/o;for(let m=0,x=0;m<h.length;m+=3,x+=2)switch(l.fromArray(h,m),c.copy(l),c.x-=Math.sign(c.x)*p,c.y-=Math.sign(c.y)*p,c.z-=Math.sign(c.z)*p,c.normalize(),h[m+0]=u.x*Math.sign(l.x)+c.x*s,h[m+1]=u.y*Math.sign(l.y)+c.y*s,h[m+2]=u.z*Math.sign(l.z)+c.z*s,d[m+0]=c.x,d[m+1]=c.y,d[m+2]=c.z,Math.floor(m/g)){case 0:v.set(1,0,0),f[x+0]=on(v,c,"z","y",s,n),f[x+1]=1-on(v,c,"y","z",s,t);break;case 1:v.set(-1,0,0),f[x+0]=1-on(v,c,"z","y",s,n),f[x+1]=1-on(v,c,"y","z",s,t);break;case 2:v.set(0,1,0),f[x+0]=1-on(v,c,"x","z",s,e),f[x+1]=on(v,c,"z","x",s,n);break;case 3:v.set(0,-1,0),f[x+0]=1-on(v,c,"x","z",s,e),f[x+1]=1-on(v,c,"z","x",s,n);break;case 4:v.set(0,0,1),f[x+0]=1-on(v,c,"x","y",s,e),f[x+1]=1-on(v,c,"y","x",s,t);break;case 5:v.set(0,0,-1),f[x+0]=on(v,c,"x","y",s,e),f[x+1]=1-on(v,c,"y","x",s,t);break}}static fromJSON(e){return new Xl(e.width,e.height,e.depth,e.segments,e.radius)}}const Fd=1.38,ya=.82,z1=.58,Ta=-.12,G1=-.52,sh=-.72,W1=.42;function X1(i,e){const t=Math.max(i,.1),n=new $t,r=[],s=new Set,o=new Set,a=new Map,l=(F,re)=>{const oe=document.createElement("canvas");oe.width=512,oe.height=512;const Te=oe.getContext("2d");Te&&F(Te,oe.width);const ze=new Bc(oe);return ze.colorSpace=Pt,ze.wrapS=_i,ze.wrapT=_i,ze.repeat.set(...re),ze.anisotropy=4,ze.needsUpdate=!0,o.add(ze),ze},c=l((F,re)=>{const oe=F.createLinearGradient(0,0,re,re);oe.addColorStop(0,"#bd9a73"),oe.addColorStop(.5,"#a98560"),oe.addColorStop(1,"#c5a17a"),F.fillStyle=oe,F.fillRect(0,0,re,re);for(let Te=0;Te<78;Te+=1){const ze=Te*6.6;F.strokeStyle=Te%5===0?"#805f43aa":"#e4c49a55",F.lineWidth=Te%5===0?1.5:.8,F.beginPath(),F.moveTo(0,ze),F.bezierCurveTo(re*.3,ze+Math.sin(Te)*4,re*.7,ze-Math.cos(Te)*4,re,ze+Math.sin(Te*.4)*3),F.stroke()}for(let Te=0;Te<8;Te+=1){const ze=(Te*83+41)%re,Ge=(Te*137+63)%re;F.strokeStyle="#76553755",F.lineWidth=1,F.beginPath(),F.ellipse(ze,Ge,17,5,.04,0,Math.PI*2),F.stroke()}},[2.6,1.8]),u=l((F,re)=>{const oe=F.createLinearGradient(0,0,re,re);oe.addColorStop(0,"#f8f4ec"),oe.addColorStop(1,"#eae3d9"),F.fillStyle=oe,F.fillRect(0,0,re,re);for(let Te=0;Te<2800;Te+=1){const ze=(Te*167+31)%re,Ge=(Te*293+79)%re;F.fillStyle=Te%2?"#ffffff20":"#b9a99813",F.fillRect(ze,Ge,1+Te%3,1+Te%2)}},[1,1]),h=l((F,re)=>{F.fillStyle="#8e9e9c",F.fillRect(0,0,re,re);for(let oe=0;oe<re;oe+=4)F.strokeStyle=oe%8===0?"#e9eeea36":"#243b3922",F.lineWidth=1,F.beginPath(),F.moveTo(0,oe),F.lineTo(re,oe+2),F.stroke(),F.beginPath(),F.moveTo(oe,0),F.lineTo(oe+2,re),F.stroke()},[1,1]),d=l((F,re)=>{F.fillStyle="#d2c4ae",F.fillRect(0,0,re,re),F.strokeStyle="#a89173",F.lineWidth=2;for(let oe=-re;oe<re*2;oe+=36)F.beginPath(),F.moveTo(0,oe),F.lineTo(re,oe+re),F.stroke(),F.beginPath(),F.moveTo(re,oe),F.lineTo(0,oe+re),F.stroke()},[2,1.5]),f=l((F,re)=>{const oe=F.createLinearGradient(0,0,0,re);oe.addColorStop(0,"#354d69"),oe.addColorStop(.6,"#889eb0"),oe.addColorStop(1,"#e3b58b"),F.fillStyle=oe,F.fillRect(0,0,re,re),F.fillStyle="#26374b";for(let Te=0;Te<9;Te+=1){const ze=Te*61,Ge=70+Te*37%130;F.fillRect(ze,re-Ge,35,Ge),F.fillStyle="#e8c887";for(let U=0;U<4;U+=1)F.fillRect(ze+8,re-Ge+12+U*22,5,7);F.fillStyle="#26374b"}F.fillStyle="#f4dba5",F.beginPath(),F.arc(re*.78,re*.22,40,0,Math.PI*2),F.fill()},[1,1]),g=(F,re=.76,oe={})=>{const Te=`${F}-${re}-${oe.emissive??0}-${oe.map?[...o].indexOf(oe.map):0}`;if(a.has(Te))return a.get(Te);const{map:ze,...Ge}=oe,U=new wo({color:F,roughness:re,...ze?{map:ze}:{},...Ge,...oe.emissive!==void 0?{emissive:new Ne(oe.emissive)}:{}});return a.set(Te,U),s.add(U),U},v=(F,re,oe,Te,ze=.76,Ge={},U)=>{const Qe=new wt(new ki(...re),g(Te,ze,{...Ge,...U?{map:U}:{}}));return Qe.name=F,Qe.position.set(...oe),Qe.castShadow=!0,Qe.receiveShadow=!0,n.add(Qe),Qe},p=(F,re,oe,Te,ze=.76,Ge=.025*t,U)=>{const Qe=new wt(new Xl(...re,3,Ge),g(Te,ze,U?{map:U}:{}));return Qe.name=F,Qe.position.set(...oe),Qe.castShadow=!0,Qe.receiveShadow=!0,n.add(Qe),Qe},m=(F,re,oe,Te,ze,Ge,U=20)=>{const Qe=new wt(new Ul(re,oe,Te,U),g(Ge,.74));return Qe.name=F,Qe.position.set(...ze),Qe.castShadow=!0,Qe.receiveShadow=!0,n.add(Qe),Qe},x=(F,re,oe,Te,ze=.8)=>{const Ge=new wt(new Ol(1,18,14),g(Te,ze));return Ge.name=F,Ge.scale.set(...re),Ge.position.set(...oe),Ge.castShadow=!0,Ge.receiveShadow=!0,n.add(Ge),Ge},A=4.8*t,y=2.8*t,b=-.92*t,E=2.55*t,_=.09*t,S=.88*t,D=.82*t,R=.84*t,N=R-D/2,O=R+D/2,W=15855851,L=14209993,G=5851198,z=Fd*t,B=.48*t,ee=-.52*t;v("bedroom-floor",[A,.09*t,y],[0,-.055*t,-.02*t],16777215,.88,{},c),v("back-wall-left",[Math.max(.1*t,e+A/2-S/2),E,_],[-A/2+(e-S/2- -A/2)/2,E/2-.02*t,b],W,.94,{},u),v("back-wall-right",[Math.max(.1*t,A/2-(e+S/2)),E,_],[(e+S/2+A/2)/2,E/2-.02*t,b],W,.94,{},u),v("wall-above-window",[S,Math.max(.1*t,E-O),_],[e,(O+E)/2-.02*t,b],W,.94,{},u),v("wall-below-window",[S,N,_],[e,N/2-.02*t,b],W,.94,{},u),v("left-side-wall",[_,E,y],[-A/2,E/2-.02*t,-.02*t],15526113,.94,{},u),v("right-side-wall",[_,E,y],[A/2,E/2-.02*t,-.02*t],15526113,.94,{},u),v("ceiling",[A,.055*t,y],[0,E,-.02*t],16184817,.96,{},u),p("skirting-board",[A,.085*t,.06*t],[0,.035*t,b+.07*t],14933458,.85,.018*t);for(const F of[-.68,.68])p(`wall-panel-${F}`,[.025*t,.68*t,.018*t],[e+F*t,.63*t,b+.055*t],15394010,.9,.025*t,u);v("window-night-glass",[S-.08*t,D-.08*t,.025*t],[e,R,b+.12*t],16777215,.28,{emissive:2571338,emissiveIntensity:.28},f);for(const[F,re,oe]of[["window-frame-top",[S+.08*t,.075*t,.1*t],[e,O,b+.13*t]],["window-frame-bottom",[S+.08*t,.08*t,.11*t],[e,N,b+.13*t]],["window-frame-left",[.075*t,D,.1*t],[e-S/2,R,b+.13*t]],["window-frame-right",[.075*t,D,.1*t],[e+S/2,R,b+.13*t]],["window-mullion-v",[.03*t,D-.05*t,.07*t],[e,R,b+.14*t]],["window-mullion-h",[S-.05*t,.03*t,.07*t],[e,R,b+.14*t]]])v(F,re,oe,L);m("curtain-rail",.018*t,.018*t,S+.34*t,[e,O+.11*t,b+.18*t],G,18).rotation.z=Math.PI/2;for(const F of[-1,1]){const re=e+F*(S*.43);for(let oe=0;oe<4;oe+=1){const Te=p(`curtain-${F}-${oe}`,[.075*t,D+.16*t,.055*t],[re+F*oe*.052*t,R-.04*t,b+.21*t],oe%2?10192258:8811892,.98,.025*t,h);Te.rotation.z=Math.sin(oe*1.4)*.025}}const Y=p("bedroom-art-frame",[.42*t,.52*t,.045*t],[e,1.68*t,b+.09*t],16777215,.7,.035*t,c);Y.rotation.y=-.04,v("bedroom-artwork",[.35*t,.45*t,.008*t],[e,1.68*t,b+.125*t],16777215,.85,{},f),p("desk-top",[.78*t,.055*t,.34*t],[z,B,ee],16777215,.58,.035*t,c),p("desk-apron",[.66*t,.09*t,.25*t],[z,B-.085*t,ee],G,.7,.018*t);for(const F of[-.29,.29])for(const re of[-.11,.11])p(`desk-leg-${F}-${re}`,[.032*t,.39*t,.032*t],[z+F*t,.2*t,ee+re*t],G,.72,.012*t);for(const F of[-1,1])p(`desk-drawer-${F}`,[.22*t,.105*t,.24*t],[z+F*.23*t,B-.12*t,ee+.035*t],16777215,.65,.012*t,c),m(`drawer-pull-${F}`,.008*t,.008*t,.05*t,[z+F*.23*t,B-.12*t,ee+.16*t],12756590,10).rotation.z=Math.PI/2;const Z=z-.48*t,te=G1*t,ye=W1*t;p("desk-chair-seat",[.27*t,.05*t,.25*t],[Z,ye,te],7438461,.95,.045*t,h),m("desk-chair-post",.035*t,.045*t,.2*t,[Z,.3*t,te],5593693,18),m("desk-chair-base",.11*t,.11*t,.035*t,[Z,.13*t,te],5593693,20);for(let F=0;F<5;F+=1){const re=F*Math.PI*2/5,oe=Math.sin(re),Te=Math.cos(re),ze=p(`desk-chair-spoke-${F}`,[.02*t,.02*t,.2*t],[Z+oe*.085*t,.13*t,te+Te*.085*t],5593693,.6,.01*t);ze.rotation.y=re,x(`desk-chair-caster-${F}`,[.018*t,.014*t,.018*t],[Z+oe*.18*t,.05*t,te+Te*.18*t],6449514,.48)}const Q=z-.22*t;p("keyboard-base",[.25*t,.02*t,.085*t],[Q,B+.04*t,ee+.075*t],3357243,.42,.012*t);const me=[12170408,13090995,10463911];for(let F=0;F<3;F+=1)for(let re=0;re<6;re+=1){const oe=p(`keyboard-key-${F}-${re}`,[.025*t,.008*t,.019*t],[Q+(re-2.5)*.035*t,B+.055*t,ee+(F-1)*.025*t+.075*t],me[(F+re)%me.length],.38,.004*t);oe.userData.restY=oe.position.y,r.push(oe)}const Me=z+.23*t;p("desk-monitor-base",[.18*t,.02*t,.09*t],[Me,B+.045*t,ee-.1*t],G,.7,.01*t),p("desk-monitor-stand",[.025*t,.11*t,.025*t],[Me,B+.105*t,ee-.11*t],5593432,.55,.009*t),p("desk-monitor",[.28*t,.18*t,.035*t],[Me,B+.21*t,ee-.12*t],2370353,.3,.018*t);const Pe=new Un({color:10337218});s.add(Pe);const _e=new wt(new Mr(.25*t,.15*t),Pe);_e.name="monitor-screen",_e.position.set(Me,B+.21*t,ee-.098*t),n.add(_e),p("lamp-base",[.12*t,.025*t,.1*t],[z-.29*t,B+.045*t,ee],G,.52,.012*t),m("lamp-stem",.012*t,.02*t,.17*t,[z-.29*t,B+.13*t,ee],10125415,14),m("lamp-shade",.04*t,.085*t,.09*t,[z-.29*t,B+.25*t,ee],15059088,20),m("desk-plant-pot",.055*t,.045*t,.075*t,[z-.2*t,B+.085*t,ee],13998968,16);for(let F=0;F<5;F+=1){const re=F*Math.PI*.4,oe=x(`desk-plant-leaf-${F}`,[.018*t,.08*t,.026*t],[z-.2*t+Math.cos(re)*.028*t,B+.15*t,ee+Math.sin(re)*.028*t],F%2?6455404:7901302,.88);oe.rotation.z=Math.cos(re)*.35,oe.rotation.x=Math.sin(re)*.3}const Be=e-1.35*t,dt=-.61*t;p("bookcase-back",[.74*t,1.28*t,.075*t],[Be,.66*t,dt],16777215,.78,.02*t,c);for(const F of[.06,.46,.86,1.25])p(`bookcase-shelf-${F}`,[.82*t,.06*t,.34*t],[Be,F*t,dt+.16*t],16777215,.68,.018*t,c);for(let F=0;F<3;F+=1)for(let re=0;re<5;re+=1){const oe=[6913142,11697768,6584966,11903359,9334384],Te=(.19+re%2*.07)*t;p(`book-${F}-${re}`,[.075*t,Te,.17*t],[Be-.29*t+re*.13*t,(.07+F*.4)*t+Te/2,dt+.16*t],oe[(re+F)%oe.length],.82,.008*t)}const Ce=e-.82*t,Ke=-.61*t;p("bed-frame",[1.02*t,.18*t,.62*t],[Ce,.13*t,Ke],7759711,.82,.035*t),p("bed-mattress",[1*t,.15*t,.6*t],[Ce,.25*t,Ke],15789542,.98,.05*t,h),p("bed-cover",[.67*t,.045*t,.57*t],[Ce+.16*t,.34*t,Ke+.015*t],8557203,.96,.028*t,h),p("bed-pillow",[.31*t,.08*t,.22*t],[Ce-.3*t,.36*t,Ke+.11*t],15591646,.98,.035*t,h),p("bed-headboard",[1.08*t,.48*t,.07*t],[Ce,.39*t,Ke-.33*t],9009517,.82,.035*t,h),p("bedroom-rug",[1.12*t,.018*t,.82*t],[e+.38*t,.005*t,-.36*t],16777215,.99,.018*t,d);const Ze=document.createElement("canvas");Ze.width=256,Ze.height=128;const He=Ze.getContext("2d");if(He){const F=He.createRadialGradient(128,64,7,128,64,64);F.addColorStop(0,"rgba(27, 31, 38, 0.34)"),F.addColorStop(.52,"rgba(27, 31, 38, 0.17)"),F.addColorStop(1,"rgba(27, 31, 38, 0)"),He.fillStyle=F,He.fillRect(0,0,256,128)}const st=new Bc(Ze);st.colorSpace=Pt,o.add(st);const et=new Un({map:st,transparent:!0,depthWrite:!1,side:jt});s.add(et);const ot=new wt(new Mr(.78*t,.34*t),et);return ot.name="avatar-contact-shadow",ot.rotation.x=-Math.PI/2,ot.position.set(z-.48*t,.003*t,-.26*t),ot.renderOrder=1,n.add(ot),{group:n,keyboardKeys:r,avatarShadow:ot,dispose:()=>{n.traverse(F=>{F instanceof wt&&F.geometry.dispose()}),s.forEach(F=>F.dispose()),o.forEach(F=>F.dispose()),a.clear()}}}const Ni=1.9,ur=.39,mr=(i,e,t)=>Math.min(t,Math.max(e,i));function q1(i=Math.random){const e=()=>{const c=i();return Number.isFinite(c)?mr(c,0,.999999):0},t=(c,u)=>c+e()*(u-c);let n="attending",r=0,s=0,o="window",a=!1;const l=()=>({activity:n,targetProgress:r,seated:!1});return{update(c,u,h,d){const f=Number.isFinite(c)?mr(c,0,.05):0,g=Number.isFinite(d)?mr(d,0,1):0;return u?(a=!0,n="attending",r=g,l()):a?(a=!1,g>.04?(n="walking-to-desk",r=0,s=Math.max(1.4,Ni*g)):(n="attending",r=0,s=t(6,10)),l()):h?(s-=f,s>0||(n==="walking-to-room-center"?(n="looking-around",r=ur,s=t(2,4)):n==="looking-around"?o==="window"?(n="walking-to-window",r=1,s=Math.max(1.4,Ni*(1-g))):(n="walking-to-desk",r=0,s=Math.max(1.4,Ni*g)):n==="walking-to-window"?(n="looking-out-window",r=1,s=t(4,7)):n==="looking-out-window"?(n="walking-to-room-center",r=ur,o="desk",s=Math.max(1.4,Ni*Math.abs(g-ur))):n==="walking-to-desk"?(n="attending",r=0,s=t(6,10)):(n="walking-to-room-center",r=ur,o="window",s=Math.max(1.4,Ni*Math.abs(g-ur)))),l()):(n="attending",r=g,l())}}}function Y1(){let i,e=0,t=0,n=Ni,r=0;return{update(s,o,a){if(s!=="walking-to-window"&&s!=="walking-to-room-center"&&s!=="walking-to-desk")return i=void 0,mr(a,0,1);s!==i&&(i=s,e=mr(a,0,1),t=s==="walking-to-window"?1:s==="walking-to-room-center"?ur:0,n=Math.max(1.4,Ni*Math.abs(t-e)),r=0),r=Math.min(n,r+mr(o,0,.05));const l=r/n,c=l*l*(3-2*l);return e+(t-e)*c}}}const Jn=1e-5,oh=(i,e,t)=>Math.min(t,Math.max(e,i));function ah(){return{planted:!1,anchor:new C}}function lh(i,e,t,n){return e?(i.planted||(t.updateWorldMatrix(!0,!1),t.getWorldPosition(i.anchor),i.anchor.y=n,i.planted=!0),i):(i.planted=!1,i)}function ch(i,e,t){if(e.lengthSq()<Jn||t.lengthSq()<Jn)return;const n=new Fe().setFromUnitVectors(e.normalize(),t.normalize()),r=i.getWorldQuaternion(new Fe);r.premultiply(n);const s=i.parent?.getWorldQuaternion(new Fe)??new Fe;i.quaternion.copy(s.invert().multiply(r).normalize()),i.updateWorldMatrix(!1,!0)}function uh(i){const{upperLeg:e,lowerLeg:t,foot:n,anchor:r,footRestWorldQuaternion:s}=i;e.updateWorldMatrix(!0,!0);const o=e.getWorldPosition(new C),a=t.getWorldPosition(new C),l=n.getWorldPosition(new C),c=o.distanceTo(a),u=a.distanceTo(l);if(c<Jn||u<Jn)return!1;const h=r.clone().sub(o),d=h.length();if(d<Jn)return!1;const f=Math.abs(c-u)+Jn,g=c+u-Jn,v=oh(d,f,g),p=h.normalize(),m=a.clone().sub(o);m.addScaledVector(p,-m.dot(p)),m.lengthSq()<Jn&&m.set(0,0,1).addScaledVector(p,-p.z),m.lengthSq()<Jn&&m.set(1,0,0).addScaledVector(p,-p.x),m.normalize();const x=oh((c*c+v*v-u*u)/(2*c*v),-1,1)*c,A=Math.sqrt(Math.max(0,c*c-x*x)),y=o.clone().addScaledVector(p,x).addScaledVector(m,A);ch(e,a.clone().sub(o),y.clone().sub(o));const b=t.getWorldPosition(new C),E=n.getWorldPosition(new C);if(ch(t,E.clone().sub(b),r.clone().sub(b)),n.parent){n.parent.updateWorldMatrix(!0,!1);const _=n.parent.getWorldQuaternion(new Fe);n.quaternion.copy(_.invert().multiply(s).normalize()),n.updateWorldMatrix(!1,!0)}return!0}const Qr=1.9,K1=.64,$1=Math.PI*2,ps=(i,e,t)=>Math.min(t,Math.max(e,i));function Z1(i){let e=0;for(let t=1;t<i.length;t+=1){const n=i[t-1],r=i[t];e+=Math.hypot(r.x-n.x,r.z-n.z)}return e}function J1(i,e){const t=Math.max(e,0)*K1;return!Number.isFinite(i)||!Number.isFinite(t)||t<=1e-8?0:Math.max(0,i)/t}function Q1(i){const e=(i%Qr+Qr)%Qr,t=$1*e/Qr,n=Math.sin(t),r=Math.max(0,-Math.cos(t)),s=Math.max(0,Math.cos(t));return{leftHip:n*.16,rightHip:-n*.16,leftKnee:r*.2,rightKnee:s*.2,leftFoot:-r*.075,rightFoot:-s*.075,leftArmSwing:-n*.075,rightArmSwing:n*.075,bodyBob:(1-Math.cos(t*2))*.0012,torsoTwist:-n*.014}}function j1(i,e,t,n,r=.2,s){if(i.times.length<2)return;const o=(n%i.duration+i.duration)%i.duration;let a=1;for(;a<i.times.length-1&&i.times[a]<=o;)a+=1;const l=a-1,c=i.times[l]??0,u=i.times[a]??i.duration,h=u>c?ps((o-c)/(u-c),0,1):0,d=new Fe,f=new Fe,g=new Fe,v=new Fe,p=new Fe,m=new Fe;for(const x of i.tracks){if(s&&!s.has(x.bone))continue;const A=e.get(x.bone),y=t.get(x.bone);if(!A||!y||x.values.length<i.times.length*4)continue;const b=(E,_)=>{const S=E*4;return _.set(x.values[S]??0,x.values[S+1]??0,x.values[S+2]??0,x.values[S+3]??1).normalize()};b(0,d),b(l,f),b(a,g),f.slerp(g,h),v.copy(d).invert().multiply(f),p.identity().slerp(v,ps(r,0,1)),m.copy(y).multiply(p).normalize(),A.quaternion.copy(m)}}function eS(i,e,t){if(t.length<2)return 0;let n=0;for(let a=1;a<t.length;a+=1){const l=t[a-1],c=t[a];n+=Math.hypot(c.x-l.x,c.z-l.z)}if(n<=1e-8)return 0;let r=0,s=1/0,o=0;for(let a=1;a<t.length;a+=1){const l=t[a-1],c=t[a],u=c.x-l.x,h=c.z-l.z,d=Math.hypot(u,h),f=d*d;if(f<=1e-8)continue;const g=ps(((i-l.x)*u+(e-l.z)*h)/f,0,1),v=i-(l.x+u*g),p=e-(l.z+h*g),m=v*v+p*p;m<s&&(s=m,o=(r+d*g)/n),r+=d}return ps(o,0,1)}function hh(i,e){if(i.length===0)return{x:0,z:0};if(i.length===1)return i[0];let t=0;for(let r=1;r<i.length;r+=1){const s=i[r-1],o=i[r];t+=Math.hypot(o.x-s.x,o.z-s.z)}if(t<=1e-8)return i[0];let n=ps(e,0,1)*t;for(let r=1;r<i.length;r+=1){const s=i[r-1],o=i[r],a=Math.hypot(o.x-s.x,o.z-s.z);if(!(a<=1e-8)){if(n<=a){const l=n/a;return{x:s.x+(o.x-s.x)*l,z:s.z+(o.z-s.z)*l}}n-=a}}return i[i.length-1]}const tS=1.6666666,nS=[0,.0416667,.0833333,.125,.1666667,.2083333,.25,.2916667,.3333333,.375,.4166667,.4583333,.5,.5416667,.5833333,.625,.6666667,.7083333,.75,.7916667,.8333333,.875,.9166667,.9583333,1,1.0416666,1.0833334,1.125,1.1666666,1.2083334,1.25,1.2916666,1.3333334,1.375,1.4166666,1.4583334,1.5,1.5416666,1.5833334,1.625,1.6666666],iS=JSON.parse('[{"bone":"hips","values":[-0.0003682,0.0174485,-0.0210892,0.9996253,-0.0003589,0.0172565,-0.0207775,0.9996351,-0.0003323,0.0167033,-0.0198854,0.9996627,-0.0002924,0.0158232,-0.0184774,0.999704,-0.0002437,0.0146506,-0.0166177,0.9997545,-0.0001901,0.0132198,-0.0143709,0.9998093,-0.0001365,0.0115643,-0.0118007,0.9998635,-0.0000873,0.0097205,-0.0089733,0.9999125,-0.000046,0.0077214,-0.0059519,0.9999525,-0.0000157,0.0056016,-0.0028012,0.9999804,0.0000014,0.0033954,0.0004143,0.9999941,0.000004,0.0011375,0.0036297,0.9999928,-0.0000078,-0.0011375,0.0067805,0.9999764,-0.0000334,-0.0033951,0.009802,0.9999462,-0.0000708,-0.0056007,0.0126296,0.9999046,-0.0001176,-0.0077208,0.0152001,0.9998547,-0.0001697,-0.0097198,0.0174471,0.9998005,-0.0002233,-0.0115638,0.0193068,0.9997467,-0.0002739,-0.0132184,0.0207147,0.999698,-0.0003167,-0.0146492,0.0216066,0.9996592,-0.000347,-0.0158221,0.021918,0.9996345,-0.0003612,-0.0167027,0.0216059,0.999627,-0.0003577,-0.0172565,0.0207135,0.9996365,-0.0003371,-0.0174492,0.0193051,0.9996613,-0.0002985,-0.0171017,0.0174453,0.9997015,-0.0002452,-0.016115,0.0151986,0.9997546,-0.0001842,-0.014573,0.0126285,0.999814,-0.0001232,-0.0125636,0.0098013,0.999873,-0.0000689,-0.0101701,0.0067802,0.9999253,-0.0000272,-0.0074778,0.0036296,0.9999655,-0.0000019,-0.004572,0.0004142,0.9999895,0.0000044,-0.0015382,-0.0028012,0.9999949,-0.0000093,0.0015382,-0.0059521,0.9999811,-0.0000409,0.0045716,-0.0089736,0.9999493,-0.0000881,0.0074768,-0.0118012,0.9999024,-0.0001462,0.0101695,-0.0143714,0.999845,-0.0002087,0.012563,-0.0166182,0.999783,-0.0002694,0.0145728,-0.0184777,0.999723,-0.0003207,0.0161137,-0.0198856,0.9996724,-0.0003556,0.0171006,-0.0207776,0.9996378,-0.0003682,0.0174485,-0.0210892,0.9996253]},{"bone":"spine","values":[0,0,0,1,0,0,0,1,-1e-7,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,-1e-7,0,0,1,0,0,0,1,0,0,0,1,-1e-7,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,-1e-7,0,0,1,-1e-7,0,0,1,-1e-7,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,-1e-7,0,0,1,0,0,0,1,-1e-7,0,0,1,-1e-7,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,1]},{"bone":"chest","values":[0.0724444,0.009943,0.013285,0.9972344,0.0734216,0.0114852,0.0124724,0.9971569,0.0752103,0.0123288,0.0114176,0.9970261,0.0775482,0.0124585,0.0101997,0.9968586,0.0801429,0.0120369,0.0088443,0.9966715,0.0827082,0.0110912,0.0074248,0.9964844,0.084942,0.0098213,0.005939,0.9963198,0.0865502,0.0084026,0.0043795,0.9962024,0.0872537,0.0069062,0.0027618,0.9961584,0.086954,0.0053675,0.001102,0.9961973,0.085855,0.0038078,-0.0005884,0.9963002,0.0841402,0.0022421,-0.0022882,0.9964488,0.0819965,0.0006833,-0.0039695,0.9966245,0.079614,-0.0008571,-0.0055974,0.9968097,0.0771856,-0.0023669,-0.0071308,0.9969884,0.0749071,-0.0038326,-0.0085247,0.9971467,0.0729765,-0.0052405,-0.0097234,0.9972725,0.0715941,-0.0065734,-0.0106711,0.9973551,0.070962,-0.0078118,-0.0113069,0.9973843,0.071221,-0.0089316,-0.0115712,0.9973534,0.0722635,-0.0099046,-0.0114181,0.997271,0.07392,-0.0106923,-0.0108305,0.997148,0.0760151,-0.0112367,-0.0098687,0.9969945,0.0783725,-0.0114429,-0.00863,0.9968211,0.080803,-0.011258,-0.0072039,0.9966405,0.0830941,-0.0107869,-0.0056208,0.9964675,0.085037,-0.010098,-0.0039176,0.9963189,0.0864264,-0.0092347,-0.0021381,0.9962131,0.0870597,-0.0082301,-0.0003182,0.996169,0.086831,-0.0071063,0.0015106,0.9961966,0.0858758,-0.0058791,0.0033264,0.996283,0.0843587,-0.0045605,0.005106,0.9964119,0.0824465,-0.0031608,0.0068216,0.9965671,0.0803093,-0.0016891,0.0084412,0.9967328,0.0781199,-0.0001539,0.0099275,0.9968945,0.076054,0.0014359,0.0112397,0.9970393,0.0742907,0.0030733,0.0123263,0.9971557,0.0730119,0.0047499,0.0131326,0.9972333,0.0724018,0.0064577,0.0135967,0.997262,0.0722443,0.0081908,0.0136648,0.9972597,0.0724444,0.009943,0.013285,0.9972344]},{"bone":"upperChest","values":[0.0731662,0.0259375,-0.0266369,0.9966265,0.0742479,0.0306034,-0.0269605,0.9964054,0.076062,0.0332468,-0.0263992,0.9961989,0.0783493,0.0338278,-0.0249955,0.9960383,0.0808391,0.0328442,-0.022855,0.9959237,0.0832637,0.0303808,-0.0200268,0.995863,0.0853463,0.0270357,-0.0166447,0.9958454,0.0868138,0.0233319,-0.0128512,0.9958684,0.0873984,0.0194622,-0.0087518,0.9959449,0.0870074,0.0155055,-0.0044519,0.996077,0.0858493,0.0114939,-0.0000597,0.9962418,0.0841098,0.0074461,0.0043256,0.9964193,0.0819757,0.0033783,0.0086113,0.9965914,0.079636,-0.0006899,0.0127111,0.9967427,0.07728,-0.0047322,0.0165448,0.9968609,0.0750982,-0.0087135,0.020038,0.9969367,0.0732819,-0.0125904,0.0231198,0.9969637,0.0720225,-0.0163085,0.0257256,0.9969378,0.0715118,-0.0198033,0.0277931,0.9968558,0.0718796,-0.0230018,0.0292599,0.9967187,0.0730074,-0.0258317,0.0300502,0.9965438,0.0747136,-0.0281946,0.0300996,0.9963518,0.0768169,-0.0299223,0.0294258,0.9961616,0.0791349,-0.0307318,0.0280471,0.9959953,0.0814817,-0.030465,0.0259918,0.99587,0.0836613,-0.0294383,0.0233572,0.9957854,0.0854792,-0.0278497,0.0202289,0.9957452,0.0867415,-0.0258232,0.0166911,0.9957562,0.087255,-0.0234363,0.0128259,0.9958277,0.0869216,-0.0207304,0.0087219,0.9959613,0.0858843,-0.0177227,0.0044774,0.9961374,0.0843126,-0.0144237,0.0001886,0.9963349,0.082377,-0.0108429,-0.0040518,0.996534,0.0802494,-0.0069917,-0.0081548,0.9967169,0.0781036,-0.0028849,-0.0120365,0.9968684,0.0761137,0.0014579,-0.0156186,0.9969757,0.0744549,0.0060145,-0.0188271,0.9970285,0.0733034,0.0107587,-0.0215959,0.9970178,0.0728355,0.0156635,-0.0238652,0.9969354,0.0728255,0.0207247,-0.0255682,0.9968015,0.0731662,0.0259375,-0.0266369,0.9966265]},{"bone":"neck","values":[-0.0728847,-0.0178625,0.0165605,0.9970429,-0.0739313,-0.0209709,0.016849,0.9969004,-0.0757408,-0.0227193,0.016564,0.9967311,-0.078051,-0.0230801,0.0157253,0.9965581,-0.0805831,-0.0223841,0.0144002,0.9963925,-0.0830612,-0.0206874,0.0126141,0.9962498,-0.0851997,-0.018389,0.0104568,0.9961393,-0.086719,-0.0158394,0.0080243,0.9960746,-0.0873467,-0.0131693,0.0053876,0.9960763,-0.0869887,-0.0104355,0.0026177,0.9961512,-0.0858518,-0.0076637,-0.0002115,0.9962784,-0.084121,-0.0048703,-0.0030335,0.996439,-0.0819833,-0.0020693,-0.0057873,0.9966148,-0.0796277,0.0007241,-0.0084175,0.9967889,-0.0772451,0.0034908,-0.0108735,0.9969467,-0.0750276,0.0062071,-0.0131095,0.997076,-0.0731691,0.0088435,-0.0150837,0.9971663,-0.0718649,0.0113646,-0.0167583,0.9972088,-0.0713103,0.013728,-0.0180975,0.9971955,-0.0716399,0.0158852,-0.0190655,0.9971218,-0.0727393,0.0177862,-0.019615,0.9969994,-0.0744313,0.0193631,-0.0197033,0.9968434,-0.0765367,0.0205027,-0.0193361,0.9966684,-0.0788737,0.0210162,-0.0185163,0.996491,-0.0812549,0.0207976,-0.0172545,0.9963269,-0.0834781,0.0200581,-0.0156123,0.9961854,-0.0853429,0.0189301,-0.0136442,0.9960783,-0.0866516,0.0174986,-0.0114026,0.9960197,-0.0872079,0.0158174,-0.0089405,0.9960244,-0.0869105,0.0139177,-0.0063162,0.9960989,-0.0859,0.0118151,-0.0035957,0.9962272,-0.0843445,0.0095203,-0.0008436,0.9963908,-0.0824133,0.0070429,0.001879,0.9965716,-0.0802778,0.0043926,0.0045143,0.9967526,-0.0781111,0.001581,0.0070087,0.9969188,-0.0760886,-0.0013782,0.0093129,0.9970566,-0.0743868,-0.0044696,0.0113827,0.9971545,-0.0731842,-0.0076762,0.0131788,0.9972018,-0.0726611,-0.0109805,0.0146676,0.9971884,-0.0725953,-0.0143775,0.0158087,0.9971325,-0.0728847,-0.0178625,0.0165605,0.9970429]},{"bone":"head","values":[0.0439272,-0.0158096,0.0183745,0.9987406,0.0439675,-0.0188869,0.0187297,0.9986788,0.0449658,-0.020634,0.0184394,0.9986052,0.0464964,-0.0210491,0.0174758,0.9985437,0.0481514,-0.0204805,0.0159036,0.9985034,0.0495181,-0.0190055,0.013715,0.9984982,0.050193,-0.0170266,0.0110145,0.9985336,0.0497693,-0.0148878,0.0079072,0.9986185,0.0489267,-0.0126902,0.0044911,0.9987117,0.0486652,-0.0104527,0.0008973,0.99876,0.0488341,-0.0081824,-0.0027793,0.9987695,0.0493047,-0.0058779,-0.0064445,0.9987457,0.0499475,-0.0035361,-0.0100013,0.9986955,0.0506309,-0.001157,-0.0133503,0.9986275,0.0512228,0.0012536,-0.0163939,0.9985519,0.05159,0.0036813,-0.0190434,0.99848,0.0515977,0.0060928,-0.0212818,0.9984226,0.0511097,0.0084422,-0.0231299,0.9983895,0.0499883,0.0106848,-0.0245646,0.9983905,0.0481576,0.0127708,-0.0255578,0.998431,0.04579,0.0146522,-0.0260684,0.9985034,0.0431205,0.0162632,-0.026057,0.9985976,0.0403874,0.0174887,-0.025526,0.9987049,0.0378296,0.018139,-0.0244658,0.99882,0.0372167,0.0180805,-0.0229118,0.9988809,0.0395496,0.0175137,-0.0209697,0.998844,0.0439126,0.016599,-0.0186898,0.9987226,0.0493895,0.0154416,-0.0161195,0.9985301,0.0550622,0.0141021,-0.0133175,0.9982945,0.0599174,0.0125981,-0.0103756,0.9980699,0.0627002,0.0108916,-0.0075102,0.9979447,0.0633751,0.0089793,-0.0047053,0.9979383,0.0629142,0.0072778,0.0001452,0.9979924,0.0614984,0.0052425,0.0043705,0.9980838,0.0593401,0.002816,0.0075697,0.9982052,0.0566523,0.0001397,0.0103368,0.9983404,0.0536412,-0.0027374,0.0127826,0.9984747,0.0505103,-0.0057812,0.014923,0.9985953,0.0474627,-0.0089687,0.0166938,0.9986932,0.0451069,-0.0123258,0.0177989,0.9987475,0.0439272,-0.0158096,0.0183745,0.9987406]},{"bone":"leftShoulder","values":[0.0000238,0.0436192,-0.0000116,0.9990482,0.0000236,0.0433032,-0.0000115,0.999062,0.0000232,0.0423986,-0.0000112,0.9991008,0.0000224,0.0409709,-0.000011,0.9991603,0.0000216,0.0390853,-0.0000104,0.9992359,0.0000202,0.0368071,-0.0000098,0.9993224,0.0000186,0.0342016,-0.0000091,0.999415,0.0000171,0.0313343,-0.0000084,0.999509,0.0000153,0.0282706,-0.0000075,0.9996003,0.0000136,0.0250754,-0.0000067,0.9996856,0.0000119,0.0218148,-0.0000059,0.999762,0.0000101,0.018554,-0.000005,0.9998279,0.0000083,0.0153582,-0.0000042,0.9998821,0.0000066,0.0122933,-0.0000034,0.9999244,0.000005,0.0094246,-0.0000027,0.9999556,0.0000035,0.0068175,-0.0000019,0.9999768,0.0000022,0.0045377,-0.0000015,0.9999897,0.0000013,0.0026506,-8e-7,0.9999965,6e-7,0.0012216,-4e-7,0.9999993,1e-7,0.0003163,-2e-7,0.9999999,-1e-7,-2e-7,-1e-7,1,0,0.0003162,-2e-7,1,5e-7,0.0012217,-4e-7,0.9999993,0.0000012,0.0026506,-8e-7,0.9999965,0.0000023,0.0045378,-0.0000013,0.9999897,0.0000036,0.0068176,-0.0000019,0.9999768,0.000005,0.0094247,-0.0000026,0.9999556,0.0000065,0.0122932,-0.0000034,0.9999244,0.0000084,0.0153583,-0.0000041,0.9998821,0.00001,0.0185539,-0.0000051,0.9998279,0.0000118,0.0218147,-0.0000059,0.999762,0.0000137,0.0250755,-0.0000066,0.9996856,0.0000154,0.0282705,-0.0000075,0.9996003,0.0000171,0.0313343,-0.0000084,0.999509,0.0000188,0.0342018,-0.000009,0.9994149,0.00002,0.0368072,-0.0000098,0.9993224,0.0000215,0.0390853,-0.0000103,0.9992359,0.0000225,0.0409709,-0.0000109,0.9991603,0.0000232,0.0423987,-0.0000113,0.9991008,0.0000237,0.0433031,-0.0000115,0.999062,0.0000238,0.0436192,-0.0000116,0.9990482]},{"bone":"leftUpperArm","values":[-0.010482,0.0314227,-0.6117,0.790396,-0.0104832,0.0329801,-0.6117765,0.7902733,-0.0104837,0.0334793,-0.6118001,0.790234,-0.0104822,0.0312068,-0.6117114,0.7903957,-0.0104773,0.0249939,-0.6114243,0.7908387,-0.0104675,0.0155921,-0.6108569,0.7915183,-0.010451,0.0036016,-0.6098928,0.7924068,-0.0104256,-0.0104798,-0.6084085,0.7934863,-0.010389,-0.0262235,-0.6062883,0.7947446,-0.0103403,-0.0432494,-0.6034346,0.7961716,-0.0102775,-0.0612126,-0.599775,0.7977577,-0.0102002,-0.0797923,-0.5952664,0.7994918,-0.0101084,-0.098685,-0.5898997,0.8013598,-0.0100022,-0.1176,-0.5837031,0.8033435,-0.0098829,-0.1362549,-0.5767466,0.8054193,-0.0097527,-0.1543689,-0.5691458,0.8075569,-0.0096144,-0.1716576,-0.561069,0.8097178,-0.0094717,-0.1878218,-0.5527468,0.8118523,-0.0093302,-0.2025287,-0.5444869,0.8138975,-0.0091966,-0.2153816,-0.5366986,0.8157701,-0.0090808,-0.2258571,-0.5299343,0.817359,-0.0089957,-0.2331873,-0.5249686,0.8185052,-0.0089611,-0.2360809,-0.5229542,0.8189654,-0.009,-0.2328339,-0.5252207,0.818444,-0.0091207,-0.2223921,-0.5322677,0.8167923,-0.0093132,-0.2043862,-0.5434976,0.8140945,-0.0095424,-0.1800518,-0.5568719,0.8107922,-0.0097657,-0.1522371,-0.5699043,0.8074265,-0.0099558,-0.1240442,-0.5809952,0.8043373,-0.0101046,-0.0975719,-0.5896905,0.80165,-0.0102164,-0.0737973,-0.5961982,0.799373,-0.0102975,-0.0529893,-0.6009414,0.7974682,-0.0103559,-0.035071,-0.6043421,0.7958853,-0.0103972,-0.019828,-0.6067511,0.7945765,-0.0104261,-0.0070066,-0.6084399,0.7935005,-0.0104461,0.0036428,-0.6096118,0.7926229,-0.0104601,0.0123487,-0.6104159,0.7919157,-0.0104694,0.0193136,-0.6109603,0.7913564,-0.0104756,0.0247147,-0.6113226,0.7909261,-0.0104795,0.0287066,-0.6115568,0.7906101,-0.010482,0.0314227,-0.6117,0.790396]},{"bone":"leftLowerArm","values":[0.0309927,-0.254143,-0.0604505,0.964778,0.0326514,-0.2524512,-0.0592327,0.9652429,0.0333658,-0.2513126,-0.0582598,0.9655747,0.0317921,-0.2507715,-0.0571379,0.9658355,0.0269904,-0.2508449,-0.0555817,0.9660533,0.0194193,-0.252491,-0.0539405,0.9658994,0.0094963,-0.2556878,-0.0524354,0.9652897,-0.0023444,-0.2597476,-0.0510264,0.9643246,-0.015746,-0.2643747,-0.0496772,0.963011,-0.0303957,-0.2694,-0.0483516,0.9613334,-0.0460102,-0.2747079,-0.0470147,0.9592749,-0.0623248,-0.2802078,-0.0456355,0.9568263,-0.0790862,-0.2858219,-0.0441879,0.9539909,-0.0960471,-0.2914773,-0.0426543,0.9507873,-0.1129605,-0.2971023,-0.041026,0.9472523,-0.1295735,-0.3026249,-0.0393073,0.9434426,-0.1456196,-0.3079696,-0.0375183,0.9394371,-0.1608069,-0.3130578,-0.0356996,0.9353403,-0.1748001,-0.3178053,-0.0339193,0.9312863,-0.1871895,-0.3221208,-0.0322856,0.9274459,-0.1974357,-0.3259026,-0.0309665,0.9240388,-0.2047627,-0.329033,-0.030231,0.9213553,-0.2079238,-0.3313633,-0.0305349,0.9198009,-0.205276,-0.3327018,-0.0324846,0.9198456,-0.1955601,-0.3328168,-0.0365152,0.9217678,-0.1783407,-0.3315932,-0.0427876,0.9254241,-0.1554245,-0.329053,-0.0505592,0.9300597,-0.1302789,-0.3252471,-0.0583606,0.9347918,-0.1057382,-0.3203173,-0.0650175,0.9391427,-0.0831754,-0.3144227,-0.0699772,0.9430394,-0.0630055,-0.3077507,-0.0731252,0.9465583,-0.045225,-0.3005528,-0.0745939,0.9497676,-0.0296983,-0.2931535,-0.0746563,0.9526833,-0.0162704,-0.2859045,-0.0736595,0.9552843,-0.0047933,-0.2791143,-0.0719661,0.9575453,0.004877,-0.2729975,-0.0699006,0.9594595,0.0128828,-0.2676658,-0.0677175,0.9610429,0.0193658,-0.2631494,-0.0655945,0.9623278,0.0244619,-0.2594255,-0.0636415,0.9633534,0.0282988,-0.256444,-0.0619182,0.9641586,0.0309927,-0.254143,-0.0604505,0.964778]},{"bone":"leftHand","values":[0.0158061,-0.1057705,-0.0110184,0.9942039,0.0164965,-0.0926816,-0.0111578,0.9954966,0.0171483,-0.0804171,-0.0112732,0.99655,0.0177453,-0.0692618,-0.0113658,0.9973759,0.0182707,-0.0594999,-0.0114368,0.9979956,0.0187079,-0.0514154,-0.0114887,0.998436,0.0190404,-0.0452916,-0.0115237,0.9987259,0.0192516,-0.0414108,-0.011544,0.99889,0.0193255,-0.0400547,-0.0115508,0.9989438,0.0192516,-0.0414107,-0.0115439,0.99889,0.0190405,-0.0452916,-0.0115237,0.9987259,0.018708,-0.0514154,-0.0114886,0.998436,0.0182707,-0.0594999,-0.0114369,0.9979956,0.0177453,-0.0692618,-0.0113658,0.9973759,0.0171484,-0.0804172,-0.0112732,0.99655,0.0164965,-0.0926816,-0.0111577,0.9954966,0.0158061,-0.1057705,-0.0110184,0.9942039,0.0150933,-0.1193994,-0.0108559,0.9926722,0.0143737,-0.133285,-0.0106723,0.990916,0.0136623,-0.1471451,-0.0104705,0.9889651,0.0129734,-0.1606997,-0.0102555,0.9868648,0.0123209,-0.1736714,-0.0100337,0.9846755,0.0117176,-0.1857855,-0.009812,0.9824715,0.0111757,-0.19677,-0.009599,0.980339,0.0107069,-0.206356,-0.0094039,0.9783732,0.0103227,-0.214276,-0.0092361,0.9766749,0.010034,-0.2202641,-0.0091054,0.9753462,0.0098521,-0.2240538,-0.0090208,0.9744852,0.0097888,-0.225377,-0.008991,0.974181,0.0098139,-0.224853,-0.0090028,0.9743017,0.0098961,-0.2231375,-0.0090414,0.9746948,0.0100479,-0.2199732,-0.0091117,0.9754116,0.0102859,-0.2150365,-0.0092197,0.9765083,0.0106298,-0.2079403,-0.0093708,0.9780389,0.0111017,-0.1982804,-0.0095689,0.9800358,0.0117176,-0.1857855,-0.009812,0.9824715,0.0124739,-0.1706172,-0.0100874,0.9852068,0.01333,-0.1536665,-0.0103693,0.9879784,0.0142132,-0.1363994,-0.0106284,0.9904949,0.0150527,-0.1201805,-0.0108461,0.9925787,0.0158061,-0.1057705,-0.0110184,0.9942039]},{"bone":"leftUpperLeg","values":[-0.2305292,-0.0001679,0.0240115,0.9727691,-0.26236,-0.0001497,0.021405,0.9647326,-0.2690397,-0.0001282,0.0183304,0.9629546,-0.2624234,-0.0001039,0.014851,0.9648385,-0.2465006,-0.0000768,0.0109797,0.9690804,-0.2233899,-0.000047,0.0067244,0.974706,-0.1942334,-0.0000147,0.0021065,0.9809531,-0.1595693,0.0000198,-0.0028297,0.9871827,-0.1192956,0.0000561,-0.0080183,0.9928264,-0.0776482,0.0000932,-0.0133338,0.9968916,-0.041069,0.0001301,-0.0185981,0.9989832,-0.0143338,0.0001652,-0.0236227,0.9996182,-0.0016007,0.0001972,-0.0282036,0.9996009,-0.0000975,0.0002245,-0.0321107,0.9994843,-0.0020202,0.0002461,-0.0351944,0.9993784,-0.0025318,0.0002621,-0.0374806,0.9992941,0.0006725,0.0002725,-0.0389687,0.9992402,0.0091746,0.0002775,-0.039683,0.9991702,0.0242678,0.0002773,-0.0396578,0.9989185,0.0479331,0.0002723,-0.038933,0.9980915,0.0830937,0.0002625,-0.0375321,0.9958347,0.0798517,0.0002483,-0.0355115,0.996174,0.0839988,0.0002341,-0.0334792,0.9959033,0.0855147,0.0002143,-0.0306446,0.9958655,0.0733246,0.0001848,-0.0264313,0.9969578,0.0426997,0.0001444,-0.0206554,0.9988744,-0.0049462,0.0000955,-0.0136567,0.9998945,-0.0651363,0.0000424,-0.0060582,0.997858,-0.1335271,-0.0000111,0.0015911,0.9910439,-0.2051399,-0.0000606,0.0086686,0.9786943,-0.2735417,-0.0001023,0.0146238,0.961749,-0.3312352,-0.0001343,0.0192087,0.9433527,-0.3738814,-0.0001576,0.0225337,0.9272027,-0.3996255,-0.0001738,0.0248604,0.9163413,-0.407771,-0.0001849,0.0264444,0.9127012,-0.3988543,-0.0001922,0.0274795,0.9166025,-0.3741624,-0.0001962,0.0280507,0.9269389,-0.3374789,-0.0001965,0.0280933,0.9409138,-0.2922605,-0.0001924,0.0275188,0.9559427,-0.2451313,-0.0001834,0.0262263,0.9691351,-0.2305292,-0.0001679,0.0240115,0.9727691]},{"bone":"leftLowerLeg","values":[0.0847463,-0.0020532,0.0001381,0.9964004,0.1826461,-0.0030221,0.0004925,0.983174,0.2323824,-0.0031073,0.0006598,0.9726193,0.2575989,-0.0027164,0.0006379,0.9662479,0.2659275,-0.0020401,0.0004794,0.9639908,0.2611256,-0.0012139,0.0002524,0.965304,0.2450017,-0.0003498,0.000023,0.9695226,0.2182098,0.0004491,-0.0001532,0.9759018,0.1802268,0.0010778,-0.0002362,0.9836245,0.1380591,0.0014762,-0.000231,0.9904229,0.1035507,0.0017112,-0.000193,0.9946227,0.0864767,0.0019572,-0.0001786,0.9962519,0.0954165,0.0024638,-0.0002436,0.9954344,0.1255363,0.0033019,-0.0004269,0.9920834,0.162159,0.0042783,-0.0007143,0.9867551,0.1963289,0.005205,-0.001055,0.9805237,0.224014,0.0059495,-0.0013814,0.9745668,0.242572,0.0064152,-0.0016188,0.9701108,0.249803,0.0065368,-0.0017018,0.9682731,0.2419864,0.0062481,-0.0015745,0.9702582,0.2131225,0.0054747,-0.0012092,0.9770094,0.2252867,0.0053918,-0.001265,0.9742768,0.2302464,0.0051619,-0.0012424,0.9731179,0.2477001,0.0049823,-0.0013004,0.9688231,0.2950959,0.0048983,-0.0015509,0.9554538,0.3695982,0.0045575,-0.0018697,0.9291786,0.4512091,0.0035454,-0.0018749,0.8924093,0.5267383,0.0018098,-0.0012351,0.8500247,0.5898923,-0.0005046,0.0002178,0.8074817,0.6362079,-0.0031337,0.002392,0.7715076,0.6627296,-0.0057522,0.0048583,0.7488209,0.6678723,-0.0080253,0.0069392,0.7442003,0.6533858,-0.0096868,0.008085,0.7569199,0.6213266,-0.0105572,0.0081007,0.7834387,0.5724392,-0.0105636,0.0071249,0.8198482,0.5073833,-0.0097871,0.0055448,0.8616471,0.4264252,-0.0083942,0.0037786,0.904476,0.3312972,-0.0065965,0.0021803,0.9435009,0.2251103,-0.0046116,0.0009737,0.9743219,0.1197763,-0.0027628,0.0002827,0.992797,0.0847463,-0.0020532,0.0001381,0.9964004]},{"bone":"leftFoot","values":[-0.080501,-0.018328,-0.0106779,0.9965288,-0.1224907,-0.0188439,-0.0070117,0.992266,-0.109849,-0.0185493,-0.0028523,0.9937711,-0.0752639,-0.0173501,0.0013078,0.9970118,-0.0437648,-0.0154246,0.0049739,0.9989104,-0.0387934,-0.0132355,0.0078547,0.9991287,-0.0519054,-0.0110982,0.0102503,0.9985377,-0.0595671,-0.008988,0.0125259,0.9981052,-0.0614858,-0.0069914,0.0146758,0.9979756,-0.0563083,-0.0049331,0.0161737,0.9982702,-0.0462181,-0.002593,0.0165561,0.9987908,-0.0377154,-0.0000055,0.015868,0.9991625,-0.0367422,0.0027057,0.014089,0.9992218,-0.0428177,0.0052359,0.0111696,0.9990067,-0.050648,0.007223,0.0072225,0.9986643,-0.0576164,0.0084654,0.0026025,0.9982995,-0.0634087,0.0089177,-0.0023412,0.9979451,-0.0683106,0.0086753,-0.0072516,0.9976,-0.0727507,0.0079555,-0.0117881,0.9972488,-0.0763492,0.0070807,-0.0156338,0.9969334,-0.0775616,0.006449,-0.0184931,0.9967952,-0.079928,0.0086157,-0.0181099,0.9965989,-0.0661615,0.0125457,-0.0133338,0.997641,-0.0425949,0.0146274,-0.0072516,0.998959,-0.0126846,0.0134793,-0.0034373,0.9998228,0.0335866,0.0104038,-0.0045811,0.9993712,0.090577,0.006511,-0.0083633,0.9958331,0.141155,0.0016427,-0.0111549,0.9899233,0.188522,-0.0037907,-0.0129043,0.9819769,0.2348333,-0.0092748,-0.0136754,0.9718952,0.2799084,-0.0141921,-0.0136203,0.9598252,0.2933849,-0.017595,-0.0134653,0.9557376,0.2566993,-0.0191015,-0.0138783,0.9662029,0.1847388,-0.0191309,-0.0145605,0.9824935,0.0950265,-0.0183397,-0.0150509,0.995192,0.0082089,-0.0174765,-0.0151158,0.9996993,-0.0562907,-0.0170256,-0.0147725,0.9981599,-0.0930017,-0.0170161,-0.0142247,0.9954189,-0.1015686,-0.0172858,-0.0135542,0.994586,-0.0864317,-0.0176829,-0.0126179,0.9960209,-0.080501,-0.018328,-0.0106779,0.9965288]},{"bone":"rightShoulder","values":[-2e-7,1e-7,0,1,2e-7,-0.0005565,1e-7,0.9999998,0.0000011,-0.0021495,6e-7,0.9999977,0.0000025,-0.0046637,0.0000012,0.9999891,0.0000043,-0.0079838,0.0000023,0.9999681,0.0000065,-0.0119949,0.0000032,0.9999281,0.0000088,-0.0165814,0.0000046,0.9998625,0.0000119,-0.0216283,0.0000057,0.9997661,0.0000146,-0.0270197,0.0000073,0.9996349,0.0000178,-0.0326405,0.0000087,0.9994672,0.000021,-0.0383756,0.0000102,0.9992634,0.0000241,-0.0441092,0.0000118,0.9990267,0.0000272,-0.0497265,0.0000132,0.9987629,0.0000301,-0.0551121,0.0000147,0.9984802,0.0000329,-0.0601514,0.000016,0.9981893,0.0000355,-0.0647295,0.0000171,0.9979028,0.0000377,-0.0687316,0.0000182,0.9976352,0.0000395,-0.0720438,0.0000191,0.9974015,0.000041,-0.0745512,0.0000197,0.9972172,0.0000419,-0.0761398,0.0000202,0.9970972,0.0000421,-0.0766945,0.0000204,0.9970546,0.0000419,-0.0761396,0.0000201,0.9970972,0.0000409,-0.0745514,0.0000197,0.9972172,0.0000394,-0.0720438,0.0000191,0.9974015,0.0000377,-0.0687318,0.0000182,0.9976352,0.0000355,-0.0647294,0.0000171,0.9979029,0.0000329,-0.0601514,0.000016,0.9981893,0.0000301,-0.0551121,0.0000147,0.9984802,0.0000272,-0.0497265,0.0000132,0.9987629,0.0000241,-0.0441093,0.0000117,0.9990267,0.0000209,-0.0383755,0.0000104,0.9992634,0.0000177,-0.0326406,0.0000088,0.9994672,0.0000148,-0.0270198,0.0000071,0.9996349,0.0000117,-0.0216283,0.0000058,0.9997661,0.0000089,-0.0165816,0.0000045,0.9998625,0.0000065,-0.011995,0.0000032,0.9999281,0.0000043,-0.007984,0.0000021,0.9999681,0.0000025,-0.0046637,0.0000012,0.9999891,0.0000012,-0.0021495,5e-7,0.9999977,2e-7,-0.0005565,2e-7,0.9999998,-2e-7,1e-7,0,1]},{"bone":"rightUpperArm","values":[-0.009117,0.2227347,0.5321215,0.8167943,-0.0090004,0.2327035,0.5253196,0.8184176,-0.0089598,0.2360791,0.5229544,0.8189659,-0.0090026,0.2325137,0.5254395,0.8183946,-0.0091325,0.2212257,0.5330262,0.8166143,-0.0093335,0.2022299,0.544759,0.8137896,-0.009565,0.1772752,0.5582739,0.8104395,-0.0097849,0.1494334,0.5711036,0.8071026,-0.0099691,0.1216289,0.581866,0.8040765,-0.0101131,0.0956884,0.5902624,0.801456,-0.0102207,0.0724218,0.5965505,0.7992359,-0.0102995,0.0520328,0.6011485,0.7973751,-0.0103563,0.0344343,0.6044589,0.7958244,-0.0103968,0.0194228,0.6068142,0.7945384,-0.010425,0.0067622,0.6084723,0.7934778,-0.0104448,-0.0037804,0.6096275,0.7926102,-0.0104585,-0.0124195,0.6104228,0.7919094,-0.0104678,-0.0193454,0.610963,0.7913535,-0.010474,-0.0247268,0.6113233,0.7909252,-0.010478,-0.0287101,0.6115569,0.7906099,-0.0104805,-0.0314246,0.6117001,0.7903959,-0.0104818,-0.0329822,0.6117765,0.7902733,-0.0104821,-0.0334814,0.6118001,0.790234,-0.0104807,-0.0317956,0.6117278,0.7903596,-0.0104768,-0.0270689,0.6114965,0.7907146,-0.0104693,-0.0197265,0.6110542,0.7912736,-0.0104568,-0.0101218,0.6103237,0.7920184,-0.0104377,0.0014433,0.6092144,0.7929355,-0.0104107,0.0147033,0.6076306,0.7940154,-0.0103737,0.0294181,0.6054783,0.7952503,-0.0103256,0.0453652,0.6026681,0.7966345,-0.0102648,0.0623324,0.5991207,0.7981627,-0.0101903,0.0801138,0.5947692,0.7998297,-0.0101011,0.0985026,0.5895629,0.8016301,-0.0099968,0.117288,0.5834719,0.8035571,-0.0098771,0.1362477,0.5764935,0.8056018,-0.0097429,0.1551378,0.5686604,0.8077516,-0.0095956,0.1736768,0.5600569,0.809988,-0.0094378,0.1915124,0.5508467,0.8122819,-0.0092748,0.2081468,0.541334,0.8145836,-0.009117,0.2227347,0.5321215,0.8167943]},{"bone":"rightLowerArm","values":[-0.1930094,0.3234826,0.0320741,0.9257849,-0.2040354,0.3279539,0.0302712,0.9218999,-0.2078772,0.3310203,0.0304809,0.9199367,-0.2049841,0.3326441,0.0325872,0.919928,-0.1944894,0.3327701,0.0369233,0.9219949,-0.1763437,0.3313549,0.0434481,0.9258613,-0.1528912,0.3283954,0.0511422,0.93068,-0.12772,0.3240481,0.0585375,0.93555,-0.1034191,0.3185661,0.0646307,0.9400229,-0.0811656,0.3122295,0.0690432,0.9440116,-0.0613064,0.3053325,0.0717849,0.947555,-0.0438312,0.2981813,0.0730585,0.9506993,-0.0286063,0.2910724,0.0731476,0.9534715,-0.0154657,0.2842624,0.0723542,0.9558873,-0.0042432,0.2779462,0.070962,0.9579626,0.0052203,0.2722512,0.0692146,0.9597194,0.0130742,0.2672445,0.0673076,0.9611863,0.0194565,0.2629478,0.0653887,0.962395,0.0244948,0.2593519,0.0635632,0.9633775,0.0283055,0.2564294,0.0619021,0.9641633,0.0309931,0.2541427,0.0604503,0.964778,0.032652,0.252451,0.0592326,0.9652429,0.0333662,0.2513125,0.0582597,0.9655747,0.0322734,0.2507431,0.0572715,0.965819,0.0287175,0.2507455,0.0560616,0.9660016,0.0229778,0.2518644,0.0547651,0.9659385,0.0153027,0.2541248,0.0534836,0.9655703,0.0059362,0.2571201,0.0522357,0.9649484,-0.0049212,0.260667,0.0510337,0.9640664,-0.017095,0.2646629,0.04988,0.9628984,-0.0304276,0.2690421,0.0487679,0.9614116,-0.0447715,0.2737567,0.04768,0.9595725,-0.0599836,0.2787668,0.0465886,0.9573508,-0.0759214,0.2840341,0.0454562,0.9547221,-0.0924391,0.2895177,0.0442355,0.951671,-0.1093815,0.2951708,0.0428706,0.9481941,-0.1265782,0.3009363,0.0413012,0.9443037,-0.1438333,0.3067457,0.039466,0.9400327,-0.1609067,0.3125143,0.0373152,0.9354418,-0.1774719,0.3181381,0.0348303,0.9306335,-0.1930094,0.3234826,0.0320741,0.9257849]},{"bone":"rightHand","values":[0.0129735,0.1606998,0.0102555,0.9868648,0.0123209,0.1736714,0.0100336,0.9846755,0.0117175,0.1857854,0.0098118,0.9824715,0.0111756,0.19677,0.0095989,0.980339,0.0107069,0.206356,0.0094037,0.9783732,0.0103226,0.214276,0.0092359,0.9766749,0.0100339,0.220264,0.0091053,0.9753462,0.0098521,0.2240537,0.0090207,0.9744852,0.0097888,0.2253771,0.0089909,0.9741809,0.0098521,0.2240537,0.0090208,0.9744853,0.010034,0.2202641,0.0091053,0.9753462,0.0103227,0.2142761,0.009236,0.9766749,0.0107069,0.2063559,0.0094038,0.9783732,0.0111757,0.1967701,0.0095989,0.980339,0.0117175,0.1857855,0.0098119,0.9824715,0.0123209,0.1736714,0.0100336,0.9846755,0.0129734,0.1606997,0.0102555,0.9868648,0.0136622,0.147145,0.0104703,0.9889651,0.0143737,0.133285,0.0106721,0.990916,0.0150932,0.1193995,0.0108559,0.9926722,0.015806,0.1057704,0.0110183,0.9942039,0.0164965,0.0926816,0.0111576,0.9954966,0.0171482,0.0804172,0.0112731,0.99655,0.0177452,0.0692617,0.0113656,0.9973759,0.0182706,0.0594999,0.0114367,0.9979956,0.0187079,0.0514154,0.0114886,0.998436,0.0190403,0.0452915,0.0115236,0.9987259,0.0192515,0.0414107,0.0115438,0.99889,0.0193254,0.0400547,0.0115505,0.9989438,0.0192961,0.0405919,0.0115479,0.9989227,0.0192005,0.0423494,0.011539,0.9988517,0.0190243,0.0455892,0.011522,0.9987126,0.0187501,0.0506383,0.0114932,0.9984749,0.0183579,0.0578841,0.0114475,0.9980889,0.0178277,0.0677255,0.0113774,0.9974798,0.0171482,0.0804172,0.0112731,0.99655,0.0163332,0.0957676,0.0111262,0.9952075,0.0154351,0.1128484,0.0109362,0.9934321,0.0145346,0.1301693,0.010715,0.9913273,0.013702,0.1463668,0.0104822,0.9890799,0.0129735,0.1606998,0.0102555,0.9868648]},{"bone":"rightUpperLeg","values":[0.1782335,-0.0002293,0.0327937,0.9834416,0.140683,-0.0002096,0.0299703,0.9896009,0.1055633,-0.0001858,0.0265709,0.9940575,0.0763109,-0.000158,0.0225985,0.9968279,0.0510407,-0.0001256,0.0179634,0.998535,0.0271794,-0.0000879,0.0125769,0.9995514,-0.009093,-0.000044,0.0062926,0.9999389,-0.065963,0.0000055,-0.0007895,0.9978218,-0.1343908,0.000056,-0.008004,0.9908961,-0.2058004,0.0001021,-0.0146081,0.978485,-0.2736488,0.000141,-0.0201603,0.9616184,-0.3305069,0.0001713,-0.024501,0.9434855,-0.3724728,0.0001941,-0.0277646,0.9276277,-0.398029,0.0002108,-0.0301467,0.9168773,-0.4065619,0.0002228,-0.0318612,0.9130675,-0.3984667,0.0002315,-0.03311,0.9165849,-0.374511,0.0002372,-0.0339168,0.9266019,-0.3376742,0.000239,-0.0341774,0.9406423,-0.2915295,0.000236,-0.0337573,0.955966,-0.2438569,0.0002272,-0.0324913,0.9692668,-0.2306752,0.0002101,-0.0300408,0.972567,-0.2635643,0.0001891,-0.0270347,0.9642629,-0.2725862,0.0001658,-0.0237106,0.9618391,-0.2692698,0.0001402,-0.0200523,0.962856,-0.2574869,0.0001127,-0.0161132,0.9661474,-0.2398515,0.0000834,-0.0119206,0.9707364,-0.2177939,0.0000523,-0.0074802,0.9759661,-0.1923758,0.0000197,-0.0028206,0.9813173,-0.1644242,-0.000014,0.0020021,0.9863877,-0.1348929,-0.0000483,0.0069063,0.9908361,-0.1049284,-0.0000824,0.0117869,0.9944099,-0.075877,-0.0001155,0.0165196,0.9969803,-0.0495364,-0.0001466,0.0209646,0.9985523,-0.0274625,-0.0001746,0.0249703,0.9993109,-0.0083456,-0.0001986,0.0283983,0.9995618,0.0099603,-0.0002181,0.0311811,0.9994641,0.029544,-0.0002326,0.0332574,0.99901,0.0523706,-0.0002417,0.0345575,0.9980296,0.0807126,-0.0002447,0.0349977,0.9961228,0.1181645,-0.000241,0.0344699,0.9923955,0.1782335,-0.0002293,0.0327937,0.9834416]},{"bone":"rightLowerLeg","values":[0.0438687,-0.002,0.0000624,0.9990353,0.1210284,-0.0029969,0.0003128,0.9926445,0.1955864,-0.0036394,0.000649,0.9806795,0.2625465,-0.0038326,0.0009469,0.9649113,0.3258651,-0.0035898,0.0011264,0.9454088,0.3872319,-0.0028729,0.0010851,0.9219772,0.4548329,-0.0016307,0.0007043,0.890575,0.5273924,0.0002497,-0.0002838,0.8496217,0.5903371,0.0026794,-0.0020766,0.8071497,0.6363521,0.0053691,-0.0045223,0.7713668,0.6625339,0.0080258,-0.0071616,0.7489547,0.6674275,0.0103347,-0.009297,0.744545,0.6529435,0.0120312,-0.0103875,0.7572398,0.62112,0.0128983,-0.010231,0.7835425,0.5724536,0.0128269,-0.0089657,0.8197878,0.5070617,0.0118818,-0.0070061,0.8617994,0.4246108,0.0101938,-0.0048015,0.9053058,0.327394,0.0080021,-0.0027936,0.9448499,0.2197115,0.0055833,-0.001273,0.9755481,0.1154676,0.0033588,-0.0003966,0.9933055,0.0850122,0.002584,-0.0002244,0.9963765,0.1845619,0.0038736,-0.000747,0.982813,0.2379803,0.004135,-0.0010437,0.9712606,0.2680468,0.0038363,-0.0011072,0.9633976,0.282216,0.003196,-0.0009881,0.959345,0.2856367,0.0023706,-0.0007615,0.9583347,0.281018,0.0014585,-0.0004879,0.9597013,0.2698923,0.0005349,-0.000215,0.9628903,0.2536514,-0.000338,0.0000211,0.9672957,0.2340051,-0.0011125,0.0001995,0.9722347,0.2131376,-0.0017633,0.000317,0.9770205,0.1937421,-0.0022936,0.0003865,0.9810497,0.1794974,-0.0027452,0.0004349,0.9837545,0.1737088,-0.0031856,0.0004942,0.9847918,0.1741023,-0.0036198,0.000569,0.9847208,0.1766651,-0.0040066,0.0006447,0.9842627,0.1773724,-0.0042769,0.0006942,0.9841343,0.1722936,-0.0043482,0.000685,0.9850358,0.1567191,-0.004125,0.0005846,0.9876344,0.1230855,-0.0034804,0.0003751,0.9923899,0.0438687,-0.002,0.0000624,0.9990353]},{"bone":"rightFoot","values":[-0.0779597,-0.0058483,0.0214112,0.9967094,-0.095531,-0.0059298,0.02305,0.9951419,-0.0786897,-0.0074328,0.0226679,0.9966137,-0.0381353,-0.0085669,0.0206094,0.9990233,0.0116856,-0.0079119,0.0175627,0.9997462,0.0590188,-0.0050774,0.0145609,0.9981378,0.0987848,-0.0006421,0.0128259,0.995026,0.1412547,0.0045712,0.0133351,0.9898729,0.188817,0.0100234,0.0148286,0.9818492,0.2352268,0.0153954,0.0156839,0.971692,0.2801339,0.0201066,0.0160451,0.9596162,0.2930562,0.0230956,0.0167486,0.9556695,0.2556305,0.0237793,0.0183773,0.9663073,0.1831391,0.0224613,0.0202205,0.9826224,0.0935731,0.0199258,0.0214538,0.9951818,0.0080665,0.0172734,0.0217238,0.9995822,-0.0539908,0.0153098,0.021108,0.9982009,-0.0887512,0.0142325,0.020035,0.9957506,-0.0968935,0.0139422,0.0188011,0.9950195,-0.0834979,0.0143325,0.01743,0.9962524,-0.0807066,0.0156912,0.0153602,0.996496,-0.1222367,0.01761,0.0121735,0.9922701,-0.1079497,0.0188306,0.0086937,0.99394,-0.0702277,0.0190448,0.0052736,0.9973352,-0.0342515,0.0180697,0.0025016,0.9992467,-0.0246139,0.0162451,0.0008784,0.9995646,-0.0337,0.0140722,0.0001376,0.9993329,-0.0384942,0.0116079,-0.0001876,0.9991914,-0.0398484,0.0089714,-0.0001248,0.9991655,-0.0388298,0.0062692,0.0002968,0.9992261,-0.0367863,0.0035978,0.0010507,0.9993161,-0.0353558,0.0010487,0.0021187,0.999372,-0.0366934,-0.0012846,0.0034952,0.9993196,-0.0427914,-0.0033008,0.0051939,0.9990651,-0.0528489,-0.0049093,0.0072239,0.9985643,-0.0651499,-0.0060545,0.0095111,0.9978118,-0.0779073,-0.0067144,0.0119564,0.9968663,-0.0893172,-0.006907,0.0144617,0.9958743,-0.0971505,-0.0066971,0.0169351,0.9951031,-0.0977734,-0.0062167,0.0192917,0.9950023,-0.0779597,-0.0058483,0.0214112,0.9967094]}]'),dh={duration:tS,times:nS,tracks:iS},rS="/activity/assets/avatar_1794982764789-BOcGJNOb.vrm",or=(i,e,t)=>Math.min(t,Math.max(e,i)),sS=new Set(["hips","spine","chest","upperChest","neck","head","leftUpperLeg","rightUpperLeg","leftLowerLeg","rightLowerLeg","leftFoot","rightFoot"]);function aS({mode:i,audioLevel:e,blinking:t,interactionActive:n}){const r=Wn.useRef(null),s=Wn.useRef(i),o=Wn.useRef(e),a=Wn.useRef(t),l=Wn.useRef(n),[c,u]=Wn.useState(!1),[h,d]=Wn.useState(0),[f,g]=Wn.useState("");return s.current=i,o.current=Number.isFinite(e)?or(e,0,1):0,a.current=t,l.current=n,Wn.useEffect(()=>{const v=r.current;if(!v)return;const p=window.matchMedia("(max-width: 700px)").matches,m=p&&(navigator.hardwareConcurrency>0&&navigator.hardwareConcurrency<=4||"deviceMemory"in navigator&&Number(navigator.deviceMemory)<=4);let x;try{x=new Kv({alpha:!0,antialias:!0,powerPreference:"high-performance"})}catch{g("Le rendu 3D WebGL n’est pas disponible dans ce navigateur.");return}let A=!1,y,b,E=1,_=0,S=0,D=0,R=0,N=[],O=0,W=0,L=0,G=0,z=0,B=0,ee=0,Y=0,Z=0,te=!1;const ye=q1(),ke=Y1();let Q=performance.now()+1800+Math.random()*1600,me=-1,Me=window.matchMedia("(prefers-reduced-motion: reduce)").matches?0:1;const Pe=window.matchMedia("(prefers-reduced-motion: reduce)"),_e=()=>{Me=Pe.matches?0:1},Be=new Map,dt=new Map,Ce=new Map,Ke=new Map,Ze=ah(),He=ah(),st=new Map,et=new Kt(40,1,.05,100),ot=new jf;ot.background=null;const F=new ft,re=new ft;x.outputColorSpace=Pt,x.toneMapping=Ml,x.toneMappingExposure=1.08,x.shadowMap.enabled=!m,x.shadowMap.type=jr;const oe=p?m?2:2.65:2.2;x.setPixelRatio(Math.min(window.devicePixelRatio||1,oe)),x.setClearColor(15855851,0),x.domElement.setAttribute("aria-hidden","true"),v.appendChild(x.domElement),ot.add(F),ot.add(re),Pe.addEventListener("change",_e);const Te=new z0(15197660,.95),ze=new O0(16774632,9140582,1.05),Ge=new cl(16770503,2.65);Ge.position.set(-3,5,4),Ge.castShadow=!m,Ge.shadow.mapSize.set(p?768:1024,p?768:1024),Ge.shadow.camera.left=-4.5,Ge.shadow.camera.right=4.5,Ge.shadow.camera.top=4,Ge.shadow.camera.bottom=-3.5,Ge.shadow.bias=-4e-4,Ge.shadow.normalBias=.025;const U=new cl(12113376,.85);U.position.set(3,2,-3),ot.add(Te,ze,Ge,U);const Qe=()=>{if(!y||!E)return;const $e=X1(E,R-E*ya);b&&(ot.remove(b.group),b.dispose()),b=$e,W=et.aspect,ot.add(b.group)},pt=()=>{const $e=v.clientWidth,fe=v.clientHeight;!$e||!fe||(x.setSize($e,fe,!1),et.aspect=$e/fe,et.updateProjectionMatrix(),y&&Math.abs(et.aspect-W)>.01&&Qe())},mt=new ResizeObserver(pt);mt.observe(v),pt();const ve=new Zv;return ve.register($e=>new v1($e)),ve.load(rS,$e=>{if(A){const q=$e.userData.vrm;q&&ti.deepDispose(q.scene);return}if(y=$e.userData.vrm,!y){g("Le fichier reçu ne contient pas de modèle VRM lisible.");return}ti.rotateVRM0(y);const fe=Math.min(x.capabilities.getMaxAnisotropy(),8),Ue=new Set;y.scene.traverse(q=>{if(!("material"in q))return;const ne=Array.isArray(q.material)?q.material:[q.material];for(const he of ne)for(const $ of Object.values(he))$ instanceof Lt&&Ue.add($)});for(const q of Ue)q.anisotropy=fe,q.minFilter=vn,q.magFilter=Bt,q.generateMipmaps=!0,q.needsUpdate=!0;y.scene.traverse(q=>{q instanceof wt&&(q.castShadow=!m,q.receiveShadow=!m)}),F.add(y.scene),y.scene.updateMatrixWorld(!0);const w=new Vn().setFromObject(y.scene),M=Math.max(.1,w.max.y-w.min.y);E=M,R=M*(Fd-z1),y.scene.position.y-=w.min.y,F.scale.setScalar(1),F.position.x=R,F.position.z=M*Ta;const k=M*Ta;N=[{x:R,z:k},{x:R-M*.45,z:k},{x:R-M*ya,z:M*sh}],O=Z1(N),et.position.set(R,M*.9,M*1.65),et.lookAt(R,M*.47,F.position.z),L=R,G=F.position.z,z=0,B=0,ee=R,Y=F.position.z,Qe();const ie=y.humanoid;for(const q of["head","hips","chest","spine","upperChest","neck","leftShoulder","rightShoulder","leftUpperLeg","rightUpperLeg","leftLowerLeg","rightLowerLeg","leftFoot","rightFoot","leftUpperArm","rightUpperArm","leftLowerArm","rightLowerArm","leftHand","rightHand"]){const ne=ie?.getNormalizedBoneNode(q);ne&&(st.set(q,ne),Be.set(q,ne.rotation.clone()),dt.set(q,ne.quaternion.clone()))}y.scene.updateMatrixWorld(!0);for(const q of["leftFoot","rightFoot"]){const ne=st.get(q);ne&&(Ce.set(q,ne.getWorldPosition(new C).y),Ke.set(q,ne.getWorldQuaternion(new Fe)))}y.lookAt&&(y.lookAt.target=re),g(""),u(!0)},$e=>{!A&&$e.total>0&&d(or($e.loaded/$e.total,0,1))},$e=>{A||g($e instanceof Error?`Le modèle n’a pas pu être chargé : ${$e.message}`:"Le modèle VRM n’a pas pu être chargé.")}),x.setAnimationLoop($e=>{const fe=_?Math.min(($e-_)/1e3,.05):0;if(_=$e,S+=fe,y){const Ue=s.current,w=Ue==="speaking",M=Ue==="thinking",k=Ue==="listening",ie=w?or((o.current-.015)*3.4,0,1):0,q=Math.sin(S*1.18)*.009*Me,ne=Me,he=E*ya,$=E*Ta,j=R-he,ue=E*sh,P=eS(F.position.x,F.position.z,N),J=ye.update(fe,l.current||Ue!=="ready"||document.visibilityState!=="visible",Me>0,P),K=J.activity==="walking-to-window",le=J.activity==="looking-out-window",ae=J.activity==="walking-to-room-center",ce=J.activity==="walking-to-desk",be=J.activity==="looking-around",Ae=Me>0&&(K||ae||ce);F.position.y=0;const se=ke.update(Ae?J.activity:"attending",Ae?fe:0,P);if(Ae&&!te&&(Z=P),te=Ae,Ae){const Zt=hh(N,se);F.position.x=Zt.x,F.position.z=Zt.z}const Ie=Math.abs(se-Z)*O,We=J1(Ie,E),de=Q1(We*Qr),at=Ae?se:P,bt=fe>0?(F.position.x-L)/fe:0,nn=fe>0?(F.position.z-G)/fe:0;L=F.position.x,G=F.position.z,z=ut.damp(z,bt,3.2,fe),B=ut.damp(B,nn,3.2,fe);const cn=hh(N,at);b&&(b.avatarShadow.position.x=F.position.x,b.avatarShadow.position.z=F.position.z);const un=.9,Rr=R+(cn.x-R)*un+or(z*.045,-E*.045,E*.045),Vi=E*1.65+(cn.z-$)*un;et.position.x=ut.damp(et.position.x,Rr,1.9,fe),et.position.z=ut.damp(et.position.z,Vi,1.9,fe);const Cr=R+(cn.x-R)*un+or(z*.025,-E*.025,E*.025),hn=$+(cn.z-$)*un;ee=ut.damp(ee,Cr,3.1,fe),Y=ut.damp(Y,hn,3.1,fe),et.lookAt(ee,E*.47,Y);const ni=Math.atan2(j-F.position.x,ue-F.position.z),Hi=Math.atan2(z,B),Mi=(Ae?Hi:le?ni:be?Math.sin(S*.42)*.2:M?Math.PI*.12:0)*Me,dn=Math.atan2(Math.sin(Mi-F.rotation.y),Math.cos(Mi-F.rotation.y));F.rotation.y+=dn*(1-Math.exp(-1.25*fe));const At=(Zt,zn,Si,An)=>{const T=st.get(Zt),I=Be.get(Zt);!T||!I||T.rotation.set(ut.damp(T.rotation.x,I.x+zn,9,fe),ut.damp(T.rotation.y,I.y+Si,9,fe),ut.damp(T.rotation.z,I.z+An,9,fe))};At("hips",0,Math.sin(S*.52)*.008*ne+(Ae?de.torsoTwist:0),0),At("leftUpperLeg",Ae?de.leftHip:0,0,0),At("rightUpperLeg",Ae?de.rightHip:0,0,0),At("leftLowerLeg",Ae?de.leftKnee:0,0,0),At("rightLowerLeg",Ae?de.rightKnee:0,0,0),At("leftFoot",Ae?de.leftFoot:0,0,0),At("rightFoot",Ae?de.rightFoot:0,0,0),At("spine",q+(M?.018:w?ie*.018:0)+(Ae?.008:0),0,0),At("chest",Math.sin(S*1.1)*.008*ne,0,w?Math.sin(S*1.35)*ie*.018:0),At("head",(M?.1:0)+(k?Math.sin(S*1.8)*.022*ne:be?Math.sin(S*.9)*.035*ne:Math.sin(S*.73)*.012*ne),Math.sin(S*(be?.72:.39))*(k?.034:be?.085:.017)*ne,M?-.065:w?Math.sin(S*1.3)*(.012+ie*.035)*ne:Math.sin(S*.51)*.012*ne);const ii=w?Me*ie*(.45+.55*Math.max(0,Math.sin(S*1.55))):0;if(At("leftUpperArm",Ae?de.leftArmSwing:w?Math.sin(S*1.4)*ii*.11:Math.sin(S*.66)*.012*ne,w?-.25:0,w?1.02+ii*.14:1.18),At("rightUpperArm",Ae?de.rightArmSwing:w?Math.sin(S*1.5+1)*ii*.08:Math.sin(S*.68+1)*.012*ne,w?.18:0,-1.18),At("leftLowerArm",w?-.28:Ae?.04:-.04,0,.035),At("rightLowerArm",w?-.08:Ae?.04:-.04,0,-.035),At("leftHand",0,0,0),At("rightHand",0,0,0),Ae){j1(dh,st,dt,We*dh.duration,.2,sS);const zn=We%1<.5,Si=!zn,An=st.get("leftFoot"),T=st.get("rightFoot"),I=st.get("leftUpperLeg"),X=st.get("leftLowerLeg"),V=st.get("rightUpperLeg"),H=st.get("rightLowerLeg"),ge=Ke.get("leftFoot"),Ee=Ke.get("rightFoot"),pe=Ce.get("leftFoot"),Se=Ce.get("rightFoot");An&&pe!==void 0&&(lh(Ze,zn,An,pe),Ze.planted&&I&&X&&ge&&uh({upperLeg:I,lowerLeg:X,foot:An,anchor:Ze.anchor,footRestWorldQuaternion:ge})),T&&Se!==void 0&&(lh(He,Si,T,Se),He.planted&&V&&H&&Ee&&uh({upperLeg:V,lowerLeg:H,foot:T,anchor:He.anchor,footRestWorldQuaternion:Ee}))}else Ze.planted=!1,He.planted=!1;const bn=Math.sin(S*(M||be?.72:.31))*(M?.16:be?.12:.045)*ne,Pr=E*(k?.79:M?.73:.76)+Math.sin(S*.47)*E*.008*ne,xs=le?j:F.position.x+bn*E;re.position.set(xs,Pr,le?ue-E*.2:E*2.6);const zi=y.expressionManager;if(zi){const Zt=performance.now();Zt>=Q&&(me=Zt,Q=Zt+2600+Math.random()*2600);const zn=me<0?1/0:Zt-me,Si=zn<170?Math.sin(zn/170*Math.PI):0,An=Math.max(Si,a.current?1:0),T=w?or((o.current-.014)*3.1,0,.92):0;D=ut.damp(D,T,15,fe);const I=(V,H)=>{zi.getExpression(V)&&zi.setValue(V,H)};I("blink",An),I("aa",D);const X=.72+Math.sin(S*5.3)*.18;I("ih",D*Math.max(0,.45-X)),I("ee",D*Math.max(0,X-.58)),I("ou",D*(1-Math.abs(Math.sin(S*4.1)))*.38),I("happy",w?.08+ie*.12:0)}y.update(fe)}x.render(ot,et)}),()=>{A=!0,mt.disconnect(),Pe.removeEventListener("change",_e),x.setAnimationLoop(null),x.dispose(),b?.dispose(),y&&ti.deepDispose(y.scene),ot.clear(),x.domElement.parentElement===v&&v.removeChild(x.domElement)}},[]),Ei.jsxDEV("div",{"data-replit-metadata":"artifacts/maximegpt-activity-demo/src/components/live-vrm-avatar.tsx:645:4","data-component-name":"div",className:"live-vrm-avatar","data-testid":"live-vrm-avatar","data-loaded":c,children:[Ei.jsxDEV("div",{"data-replit-metadata":"artifacts/maximegpt-activity-demo/src/components/live-vrm-avatar.tsx:646:6","data-component-name":"div",ref:r,className:`live-vrm-canvas${c&&!f?" live-vrm-canvas--visible":""}`,"aria-label":"Personnage Maxime en 3D","data-testid":"canvas-live-vrm"},void 0,!1,{fileName:"/home/runner/workspace/artifacts/maximegpt-activity-demo/src/components/live-vrm-avatar.tsx",lineNumber:646,columnNumber:7},this),!c&&!f&&Ei.jsxDEV("div",{"data-replit-metadata":"artifacts/maximegpt-activity-demo/src/components/live-vrm-avatar.tsx:653:8","data-component-name":"div",className:"live-vrm-placeholder",role:"status","aria-live":"polite",children:[Ei.jsxDEV("span",{"data-replit-metadata":"artifacts/maximegpt-activity-demo/src/components/live-vrm-avatar.tsx:654:10","data-component-name":"span",className:"live-vrm-progress-track","aria-hidden":"true",children:Ei.jsxDEV("i",{"data-replit-metadata":"artifacts/maximegpt-activity-demo/src/components/live-vrm-avatar.tsx:654:71","data-component-name":"i",style:{transform:`scaleX(${Math.max(.12,h)})`}},void 0,!1,{fileName:"/home/runner/workspace/artifacts/maximegpt-activity-demo/src/components/live-vrm-avatar.tsx",lineNumber:654,columnNumber:198},this)},void 0,!1,{fileName:"/home/runner/workspace/artifacts/maximegpt-activity-demo/src/components/live-vrm-avatar.tsx",lineNumber:654,columnNumber:11},this),Ei.jsxDEV("span",{"data-replit-metadata":"artifacts/maximegpt-activity-demo/src/components/live-vrm-avatar.tsx:655:10","data-component-name":"span",children:h>0?"Chargement du personnage 3D…":"Préparation du personnage 3D…"},void 0,!1,{fileName:"/home/runner/workspace/artifacts/maximegpt-activity-demo/src/components/live-vrm-avatar.tsx",lineNumber:655,columnNumber:11},this)]},void 0,!0,{fileName:"/home/runner/workspace/artifacts/maximegpt-activity-demo/src/components/live-vrm-avatar.tsx",lineNumber:653,columnNumber:9},this),f&&Ei.jsxDEV("span",{"data-replit-metadata":"artifacts/maximegpt-activity-demo/src/components/live-vrm-avatar.tsx:658:16","data-component-name":"span",className:"live-vrm-notice live-vrm-notice--error",role:"status",children:f},void 0,!1,{fileName:"/home/runner/workspace/artifacts/maximegpt-activity-demo/src/components/live-vrm-avatar.tsx",lineNumber:658,columnNumber:17},this)]},void 0,!0,{fileName:"/home/runner/workspace/artifacts/maximegpt-activity-demo/src/components/live-vrm-avatar.tsx",lineNumber:645,columnNumber:5},this)}export{aS as LiveVrmAvatar};
