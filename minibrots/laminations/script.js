import Utils, {onFirstVisible} from "../../util/Utils.js";

Utils.onPageLoad(()=>{
    const WIDTH = 1920;
    const HEIGHT = 1920;
    const R = 900;
    const canvas = document.querySelector("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0,0,WIDTH,HEIGHT);
    //ctx.strokeStyle = "#ffffffdf";//"rgba(1,1,1,0.9)";
    ctx.beginPath();
    ctx.arc(WIDTH/2,HEIGHT/2,R,0,Math.PI*2);
    ctx.stroke();
    for (let n=2;n<13;n++){
        let array = [""];
        let m = 2**n-1;
        for (let i=1;i<m;i++){
            let s = "";//i+"/"+m+":";
            for (let j=0;j<n;j++){
                if ((i*2**j)%m>i/2&&(i*2**j)%m<(i+m)/2){
                    s += "1";
                }else{
                    s += "0";
                }
            }
            array.push(s);
        }
        for (let n2=2;n2<n;n2++){
            let m2 = 2**n2-1;
            if (m%m2==0){
                for (let i=m/m2;i<m;i+=m/m2){
                    array[i] = "";
                }
            }
        }
        for (let i=0;i<m;i++){
            if (array[i]!=""){
                for (let j=i+1;j<m;j++){
                    if (array[i]==array[j]){
                        drawArc(i/m,j/m);
                        array[i] = "";
                        array[j] = "";
                        break;
                    }
                }
            }
        }
    }
    ctx.stroke();
        
    /**
     * Draws an arc connecting the points at two given angles in the circle.
     * @param {number} a
     * @param {number} b
     */
    function drawArc(a,b){
        let cx = (Math.cos(a*Math.PI*2)+Math.cos(b*Math.PI*2))/2;
        let cy = (Math.sin(a*Math.PI*2)+Math.sin(b*Math.PI*2))/2;
        let temp = cx*cx+cy*cy;
        cx /= temp;
        cy /= temp;
        ctx.beginPath();
        ctx.arc(WIDTH/2+R*cx,HEIGHT/2+R*cy,R*Math.sqrt(1-temp)/Math.sqrt(temp),(b+0.25)*Math.PI*2,(a-0.25)*Math.PI*2);
        ctx.stroke();
        /*ctx.beginPath();
        ctx.moveTo(WIDTH/2+R*Math.cos(a*Math.PI*2),HEIGHT/2+R*Math.sin(a*Math.PI*2));
        ctx.lineTo(WIDTH/2+R*Math.cos(b*Math.PI*2),HEIGHT/2+R*Math.sin(b*Math.PI*2));
        ctx.stroke();*/
    }
});