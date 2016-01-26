
(function (exports) {
  'use strict';
  function toInt(bytes) {
    var timestamp = 0;
    for (var i = 0; i < bytes.length; i++) {
      var b = bytes[(bytes.length - 1) - i];
      var c = b << (i*8);
      timestamp = c | timestamp;
    }
    return timestamp;
  }

  function toStr(bytes) {
    var str = "";
    for (var i = 0; i < bytes.length; i++) {
      str += String.fromCharCode(bytes[i]);
    }
    return str;
  }

  function parse(bytes) {
    var value_sz = toInt(bytes.slice(0,3+1));
    var value = toStr(bytes.slice(4,4+value_sz));
    try {
      value = JSON.parse(value);
    } catch(e) {}
    return value;
  }

  function toSeconds(duration, unit) {
    switch (unit) {
      case "seconds":
        return duration;
      case "minutes":
        return 60 * duration;
      case "hours":
        return 60*60 * duration;
      case "days":
        return 24*60*60 * duration;
      case "weeks":
        return 7*24*60*60 * duration;
      case "months":
        return 30*7*24*60*60 * duration;
      default:
        return duration;
    }
  }

  function PNGValue(url) {
    this.url = url;
  }

  PNGValue.prototype.get = function() {
    var url = this.url;
    return new Promise(function(resolve, reject) {
      var img = new Image();
      img.setAttribute('crossOrigin', 'anonymous');
  
      img.onload = function() {
        if ('naturalHeight' in this) {
          if (this.naturalHeight + this.naturalWidth === 0) {
            this.onerror();
            return;
          }
        } else if (this.width + this.height === 0) {
          this.onerror();
          return;
        }

        var canvas = document.createElement('canvas');
        canvas.width = this.width;
        canvas.height = this.height;
 
        // Get the context and render the image
        var ctx = canvas.getContext('2d');
        ctx.drawImage(this, 0, 0);
 
        // Get the raw image byte array. In a 2d context, each pixel is respresented
        // by an RGBA 4 byte pair. We encoded as a grayscale image, so we only need
        // one of the first three bytes (which all have the same value).
        var data = ctx.getImageData(0, 0, this.width, this.height).data;
        var bytes = [];
        for (var i = 0; i*4 < data.length; i++) {
          bytes.push(data[i*4]);
        }

        resolve(this.parse(bytes));
      };

      img.onerror = function() {
        resolve(null);
      };

      img.src = url;
    });
  };

  PNGValue.prototype.set = function(value, duration, unit) {
    console.log("value: " + JSON.stringify(value) + " - duration: " + duration + " - unit: " + unit);

    var seconds = this.toSeconds(duration, unit);
    var url = this.url;

    return new Promise(function(resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url);

      try {
        xhr.overrideMimeType("image/png");
      } catch(e) {
      }

      xhr.onload = function(response) {
        resolve();
      };
      xhr.onerror = function(err) {
        reject(err);
      };

      // Force reload of the image on set requests
      xhr.setRequestHeader("Cache-Control", "max-age=0");
      xhr.setRequestHeader("value", JSON.stringify(value));
      xhr.setRequestHeader("seconds", seconds);

      xhr.send();
    });
  };

  exports = PNGValue;
})(typeof exports === 'undefined' ? this.PNGValue={} : exports);
