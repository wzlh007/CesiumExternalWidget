/**
 * Created by thomas on 27/01/14.
 */

var Graticule = (function() {

    function defaultValue(options, defaultOptions) {
        var newOptions = {}, option;
        for(option in options) {
            newOptions[option] = options[option];
        }
        for(option in defaultOptions) {
            if(newOptions[option] === undefined) {
                newOptions[option] = defaultOptions[option];
            }
        }
        return newOptions;
    }

    function _(description, scene) {

        description = description || {};

        this._tilingScheme = description.tilingScheme || new Cesium.GeographicTilingScheme();

        this._color = description.color || new Cesium.Color(1.0, 1.0, 1.0, 0.4);

        this._tileWidth = description.tileWidth || 256;
        this._tileHeight = description.tileHeight || 256;

        this._ready = true;

        // default to decimal intervals
        this._sexagesimal = description.sexagesimal || false;
        this._numLines = description.numLines || 50;

        this._scene = scene;
        this._labels = new Cesium.LabelCollection();
        scene.primitives.add(this._labels);
        this._polylines = new Cesium.PolylineCollection();
		this._specLines = new Cesium.PolylineCollection();
		//console.log('start');
        scene.primitives.add(this._polylines);
        scene.primitives.add(this._specLines);
		//console.log('end');
        this._ellipsoid = scene.globe.ellipsoid;

        var canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        this._canvas = canvas;

    };

    var definePropertyWorks = (function() {
        try {
            return 'x' in Object.defineProperty({}, 'x', {});
        } catch (e) {
            return false;
        }
    })();

    /**
     * Defines properties on an object, using Object.defineProperties if available,
     * otherwise returns the object unchanged.  This function should be used in
     * setup code to prevent errors from completely halting JavaScript execution
     * in legacy browsers.
     *
     * @private
     *
     * @exports defineProperties
     */
    var defineProperties = Object.defineProperties;
    if (!definePropertyWorks || !defineProperties) {
        defineProperties = function(o) {
            return o;
        };
    }

    defineProperties(_.prototype, {
        url : {
            get : function() {
                return undefined;
            }
        },

        proxy : {
            get : function() {
                return undefined;
            }
        },

        tileWidth : {
            get : function() {
                return this._tileWidth;
            }
        },

        tileHeight: {
            get : function() {
                return this._tileHeight;
            }
        },

        maximumLevel : {
            get : function() {
                return 18;
            }
        },

        minimumLevel : {
            get : function() {
                return 0;
            }
        },
        tilingScheme : {
            get : function() {
                return this._tilingScheme;
            }
        },
        rectangle : {
            get : function() {
                return this._tilingScheme.rectangle;
            }
        },
        tileDiscardPolicy : {
            get : function() {
                return undefined;
            }
        },
        errorEvent : {
            get : function() {
                return this._errorEvent;
            }
        },
        ready : {
            get : function() {
                return this._ready;
            }
        },
        credit : {
            get : function() {
                return this._credit;
            }
        },
        hasAlphaChannel : {
            get : function() {
                return true;
            }
        }
    });

     _.prototype.makeLabel = function(lng, lat, text, top, color) {
        this._labels.add({
            position : this._ellipsoid.cartographicToCartesian(new Cesium.Cartographic(lng, lat, 10.0)),
            text : text,
            font : '15px 微软雅黑',
            fillColor : Cesium.Color.WHITE,
            //outlineColor : 'white',
            //style : Cesium.LabelStyle.FILL,
            pixelOffset : new Cesium.Cartesian2(5, top ? 15 : -15),
            eyeOffset : Cesium.Cartesian3.ZERO,
            horizontalOrigin : Cesium.HorizontalOrigin.LEFT,
            verticalOrigin : top ? Cesium.VerticalOrigin.BOTTOM : Cesium.VerticalOrigin.TOP,
            scale : 1.0
        });
    };
	_.prototype.makeLabel4Spec = function(lng, lat, text, top, color) {
        this._labels.add({
            position : this._ellipsoid.cartographicToCartesian(new Cesium.Cartographic(lng, lat, 10.0)),
            text : text,
            font : '15px 微软雅黑',
            fillColor : Cesium.Color.WHITE,
            //outlineColor : 'white',
            //style : Cesium.LabelStyle.FILL,
            pixelOffset : new Cesium.Cartesian2(5, top ? 15 : -15),
            eyeOffset : Cesium.Cartesian3.ZERO,
            horizontalOrigin : Cesium.HorizontalOrigin.LEFT,
            verticalOrigin : top ? Cesium.VerticalOrigin.BOTTOM : Cesium.VerticalOrigin.TOP,
            scale : 1.0
        });
    };

    _.prototype._drawGrid = function(extent) {

        if(this._currentExtent && this._currentExtent.equals(extent)) {
            return;
        }
        this._currentExtent = extent;

        this._polylines.removeAll();
        this._specLines.removeAll();
        this._labels.removeAll();

        var minPixel = 0;
        var maxPixel = this._canvasSize;

        var dLat = 0, dLng = 0, index;
        // get the nearest to the calculated value
        for(index = 0; index < mins.length && dLat < ((extent.north - extent.south) / 10); index++) {
            dLat = mins[index];
        }
        for(index = 0; index < mins.length && dLng < ((extent.east - extent.west) / 10); index++) {
            dLng = mins[index];
        }

        // round iteration limits to the computed grid interval
        var minLng = (extent.west < 0 ? Math.ceil(extent.west / dLng) : Math.floor(extent.west / dLng)) * dLng;
        var minLat = (extent.south < 0 ? Math.ceil(extent.south / dLat) : Math.floor(extent.south / dLat)) * dLat;
        var maxLng = (extent.east < 0 ? Math.ceil(extent.east / dLat) : Math.floor(extent.east / dLat)) * dLat;
        var maxLat = (extent.north < 0 ? Math.ceil(extent.north / dLng) : Math.floor(extent.north / dLng)) * dLng;

        // extend to make sure we cover for non refresh of tiles
        minLng = Math.max(minLng - 2 * dLng, -Math.PI);
        maxLng = Math.min(maxLng + 2 * dLng, Math.PI);
        minLat = Math.max(minLat - 2 * dLat, -Math.PI / 2);
        maxLat = Math.min(maxLat + 2 * dLng, Math.PI / 2);

        var ellipsoid = this._ellipsoid;
        var lat, lng, granularity = Cesium.Math.toRadians(1);

        // labels positions
        var latitudeText = minLat + Math.floor((maxLat - minLat) / dLat / 2) * dLat;
        for(lng = minLng; lng < maxLng; lng += dLng) {
            // draw meridian
            var path = [];
            for(lat = minLat; lat < maxLat; lat += granularity) {
                path.push(new Cesium.Cartographic(lng, lat))
            }
            path.push(new Cesium.Cartographic(lng, maxLat));
            this._polylines.add({
                positions : ellipsoid.cartographicArrayToCartesianArray(path),
                width: 1
            });
            var degLng = Cesium.Math.toDegrees(lng);
            this.makeLabel(lng, latitudeText, this._sexagesimal ? this._decToSex(degLng) : degreeToText(degLng,dLng,'lon'), false);
        }
		
        // lats
        var longitudeText = minLng + Math.floor((maxLng - minLng) / dLng / 2) * dLng;
        for(lat = minLat; lat < maxLat; lat += dLat) {
            // draw parallels
            var path = [];
            for(lng = minLng; lng < maxLng; lng += granularity) {
                path.push(new Cesium.Cartographic(lng, lat))
            }
            path.push(new Cesium.Cartographic(maxLng, lat));
            this._polylines.add({
                positions : ellipsoid.cartographicArrayToCartesianArray(path),
                width: 1,
            });
            var degLat = Cesium.Math.toDegrees(lat);
            this.makeLabel(longitudeText, lat, this._sexagesimal ? this._decToSex(degLat) : degreeToText(degLat,dLat,'lat'), true);
        }
		//特殊经纬线
		
		
		//console.log('mark');
		for(var i=0;i<specLines.length;i++)
		{
			//为什么material要加在循环里面才不会报错，否则会说object destroy？
			var material = Cesium.Material.fromType('Color', {
				color : new Cesium.Color(1.0, 1.0, 0.0, 1.0)
			});
			var path = [];
			for(lng = minLng; lng < maxLng; lng += granularity) {
				path.push(new Cesium.Cartographic(lng, Cesium.Math.toRadians(specLines[i])));
			}
			path.push(new Cesium.Cartographic(maxLng, Cesium.Math.toRadians(specLines[i])));
			this._specLines.add({
				positions : ellipsoid.cartographicArrayToCartesianArray(path),
				material : material,
				width: 2,
			});
			this.makeLabel(Cesium.Math.toRadians(90), Cesium.Math.toRadians(specLines[i]), 'haha', true);
		}
    };

    _.prototype.requestImage = function(x, y, level) {

        if(this._show) {
            this._drawGrid(this._getExtentView());
        }

        return this._canvas;
    };

    _.prototype.setVisible = function(visible) {
        this._show = visible;
        if(!visible) {
            this._polylines.removeAll();
            this._labels.removeAll();
        } else {
            this._currentExtent = null;
            this._drawGrid(this._getExtentView());
        }
    }

    _.prototype.isVisible = function() {
        return this._show;
    }

    _.prototype._decToSex = function(d) {
        var degs = Math.floor(d);
        var mins = ((Math.abs(d) - degs) * 60.0).toFixed(2);
        if (mins == "60.00") { degs += 1.0; mins = "0.00"; }
        return [degs, ":", mins].join('');
    };

    _.prototype._getExtentView = function(){
        var camera = this._scene.camera ;
        var canvas = this._scene.canvas;
        var corners = [
            camera.pickEllipsoid(new Cesium.Cartesian2(0, 0), this._ellipsoid),
            camera.pickEllipsoid(new Cesium.Cartesian2(canvas.width, 0), this._ellipsoid),
            camera.pickEllipsoid(new Cesium.Cartesian2(0, canvas.height), this._ellipsoid),
            camera.pickEllipsoid(new Cesium.Cartesian2(canvas.width, canvas.height), this._ellipsoid)
        ];
        for(var index = 0; index < 4; index++) {
            if(corners[index] === undefined) {
                return Cesium.Rectangle.MAX_VALUE;
            }
        }
        return Cesium.Rectangle.fromCartographicArray(this._ellipsoid.cartesianArrayToCartographicArray(corners));
    }
	
    function gridPrecision(dDeg) {
        if (dDeg < 0.01) return 3;
        if (dDeg < 0.1) return 2;
        if (dDeg < 1) return 1;
        return 0;
    }
	function degreeToText(num,dDeg,lonlat)
	{
		var string ;
		if(lonlat=='lon')
		{
			if(num>0) string = Math.abs(num).toFixed(gridPrecision(dDeg))+'°E';
			else if(num==0) string = Math.abs(num).toFixed(gridPrecision(dDeg));
			else string = Math.abs(num).toFixed(gridPrecision(dDeg))+'°W';
		}
		else if(lonlat == 'lat')
		{
			if(num>0) string = Math.abs(num).toFixed(gridPrecision(dDeg))+'°N';
			else if(num==0) string = Math.abs(num).toFixed(gridPrecision(dDeg));
			else string = Math.abs(num).toFixed(gridPrecision(dDeg))+'°S';
		}
		else return false;
		return string;
	}

    var mins = [
        Cesium.Math.toRadians(0.05),
        Cesium.Math.toRadians(0.1),
        Cesium.Math.toRadians(0.2),
        Cesium.Math.toRadians(0.5),
        Cesium.Math.toRadians(1.0),
        Cesium.Math.toRadians(2.0),
        Cesium.Math.toRadians(5.0),
        Cesium.Math.toRadians(10.0)
    ];

	var specLines = [66.5,23.5,0,-23.5,-66.5];
	
    function loggingMessage(message) {
        var logging = document.getElementById('logging');
        logging.innerHTML += message;
    }
	
	
    return _;

})();