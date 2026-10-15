// Deterministic UI colour theme: keep original pixels, lettering and chart geometry.
const cache=new Map();
export async function darkSlide(url){if(cache.has(url))return cache.get(url);const task=(async()=>{const image=new Image();image.src=url;await image.decode();const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(image,0,0);const data=x.getImageData(0,0,c.width,c.height),src=new Uint8ClampedArray(data.data),w=c.width,h=c.height;
 const blue=(i)=>src[i+2]>src[i]*1.35&&src[i+2]>src[i+1]*1.2&&src[i+2]>65;
 const visited=new Uint8Array(w*h),regions=[];
 for(let k=0;k<w*h;k++){if(visited[k]||!blue(k*4))continue;const queue=[k];visited[k]=1;let left=w,right=0,top=h,bottom=0;for(let q=0;q<queue.length;q++){const n=queue[q],xx=n%w,yy=Math.floor(n/w);left=Math.min(left,xx);right=Math.max(right,xx);top=Math.min(top,yy);bottom=Math.max(bottom,yy);for(const v of [n-1,n+1,n-w,n+w])if(v>=0&&v<w*h&&!visited[v]&&Math.abs(v%w-xx)<=1&&blue(v*4)){visited[v]=1;queue.push(v);}}if(queue.length>w*h*.025&&right-left>w*.22&&bottom-top>h*.13)regions.push([left,right,top,bottom]);}
 for(let y=0;y<h;y++)for(let xx=0;xx<w;xx++){const i=(y*w+xx)*4;const inPanel=regions.some(([l,r,t,b])=>xx>=l&&xx<=r&&y>=t&&y<=b&&!((xx<l+32||xx>r-32)&&(y<t+32||y>b-32)&&!blue(i)));
 const r=src[i],g=src[i+1],b=src[i+2],v=(r+g+b)/765;let out;
 if(inPanel){const a=Math.max(0,Math.min(1,(Math.min(r,g,b)-110)/120));out=[25+216*a,23+218*a,42+203*a];}
 else if(blue(i))out=[182,171,255];
 else if(g>r*1.25&&g>b*.95&&g>85)out=[78,222,188];
 else {const a=Math.pow(1-v,1.05);out=[16+225*a,17+225*a,22+223*a];}
 for(let j=0;j<3;j++)data.data[i+j]=out[j];}
 x.putImageData(data,0,0);return c;})();cache.set(url,task);return task;}
export async function themeImage(img){const url=img.src;const c=await darkSlide(url);if(img.isConnected&&img.src===url)img.src=c.toDataURL('image/png');}
