export default class Rect{
    constructor(x1, y1, x2, y2, context){
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
        this.touchMe = false;
        this.touched = false;
        this.color = "rgb(255,255,255,1)";
        this.context = context;

        this.drawSelf();
    }

    drawSelf = () => {
        // This draws the square (while method is called Rect, it's always a square)
        // this.context.moveTo(this.x1, this.y1);
        this.context.beginPath();
        this.context.fillStyle = this.color;
        this.context.fillRect(this.x1, this.y1, this.x2-this.x1, this.y2-this.y1);
        this.context.stroke();
    }

    touchMeNow = () => {
        // change color to attract attention
        this.touchMe = true;
        this.color = "rgb(0,0,255,1)";
        // this.drawSelf();
    }

    reveal = () =>{
        this.touched = true;
        this.color = "rgb(255,255,255,0)";
        // this.drawSelf();
    }

    revert = () =>{
        this.touchMe = false;
        this.color = "rgb(255,255,255,1)";
        // this.drawSelf();
    }

    isWithin = (x, y) => {
        // This function checks the PoseNet coordinate and returns true if it is within.
        // This should only be run on the square actively begging for touch
        // https://www.geeksforgeeks.org/check-if-a-point-lies-on-or-inside-a-rectangle-set-2/
        if (x > this.x1 && x < this.x2 && 
            y > this.y1 && y < this.y2){
            return true
        }
        else {
            return false
        }
    }

    wasTouched = (x, y) =>{
        if(this.touchMe && !this.touched){
            if (this.isWithin(x, y)){
                this.reveal();
                return true;
            }
        }
    }


}