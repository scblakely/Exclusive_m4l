autowatch = 1;
outlets = 4;

/*
Exclusive subtrack M4L device

When placed on a group track, this device mutes all except one un-muted subtrack
If a muted track is un-muted, then the previously un-muted track will be muted.

main: 
identify the device parent track
iterate through the tracks
  check to see if the track is a subtrack
    if so, look at the group_track value to match the device parent track
      if a subtrack of the device parent track
        install a callback on the mute object
        if this is the first un-muted track, record the id
        else mute the track

callback when mute changes:
find the id of the mute object parent
check it against current un-muted track
  send a message via deferlow to mute the current un-muted track
  update the current un-muted 

*/

/**
 * lapiexplore.js
 * written by Jannik Lemberg in 2015
 **/

var Explorer = (function() {

var apiNodes = {};  

function getApiNode(path) {
  if(!apiNodes[path]) {
    apiNodes[path] = new ApiNode(path);
  } 
  return apiNodes[path];
}

function us2cc(string) {
  var parts = string.split('_');
  for(var i=1,j=parts.length;i<j;i++) {
    var first = parts[i].charAt(0).toUpperCase();
    parts[i] = first + parts[i].substr(1);
  }
  return parts.join('');
}

function ApiNode(_path, _callback, _property) {
  var self = this;
  if (!_callback) {
      _property = "";
      _callback = null;
  }
  if(!_path) _path = 'live_set';
  if (_callback) {
    var _api = new LiveAPI(_callback, _path);
    _api.property = _property;
  } else {
    var _api = new LiveAPI(_path);
  }
  var _properties = [];
  var _functions = [];
  var _isVector = false;
  this.getId = function() {
	return _api.id;
  }
  this.getPath = function() {
    return _isVector ? _path : _api.unquotedpath;
  };
  this.setPath = function(apath) {
	_api.path = apath;
  };
  this.getInfo = function() {
    var infoString = 'Path: '+ self.getPath() + "\n";
    if(!_isVector) {
      infoString += "API Properties:\n";
      for(var i=0,j=_properties.length;i<j;i++) {
        infoString += ' - '+_properties[i]+"\n";
      }
      infoString += "API Methods:\n";
      for(i=0,j=_functions.length;i<j;i++) {
        infoString += ' - '+_functions[i]+"\n";
      }
    } else {
      infoString += 'Vector containing '+self.getCount()+" elements\n";
    }
    return infoString;
  };
  var _addProperty = function(prop) {
    _properties[_properties.length] = prop;
    self[us2cc('get_'+prop)] = (function(p){
      return function(){
        return _api.get(p);
      };
    })(prop);
    self[us2cc('set_'+prop)] = (function(p){
      return function(arg){
        return _api.set(p,arg);
      };
    })(prop);
  };
  var _addFunction = function(func) {
    _functions[_functions.length] = func;
    self[us2cc(func)] = (function(f){
      return function(arg){
        return _api.call(f,arg);
      };
    })(func);
  };
  var _addChildProperty = function(name, isCollection) {
    self[us2cc('get_'+name)] = (function(n){
      return function(){
        return getApiNode(self.getPath() + ' ' + name);
      };
    })(name);
    if(isCollection) {
      self[us2cc('get_'+name.substr(0,name.length-1)+'_by_name')] = (function(n) {
        return function(searchName) {
          var collection = self[us2cc('get_'+n)]().get();
          for(var i=0, j=collection.length;i<j; i++) {
            var node = collection[i];
            if(node.getName && node.getName() == searchName) {
              return node;
            }
          }
          return false;
        };
      })(name);
    }
  };
  var infoLines = _api.info.split("\n");
  
  if(infoLines[1] == 'type Vector') {
    _isVector = true;
    var _childCount = _api.children[0];
    var _children = [];
    for(var i=0;i<_childCount;i++) {
      _children[i] = getApiNode(this.getPath() + ' ' + i);
    }
    this.get = function(offset) {
      if(offset === undefined) {
        return _children;
      }
      return _children[offset];
    };
    this.getFirst = function() {
      return _children[0];
    };
    this.getLast = function() {
      return _children[_childCount -1];
    };
    this.getCount = function() {
      return _childCount;
    };
    this.each = function(callback) {
      for(var i=0;i<_childCount;i++) {
        callback(i,_children[i]);
      }
    };
  } else {
    this.getParent = function() {
      var parentPath = self.getPath() + ' canonical_parent';
      var check = new LiveAPI(parentPath);
      if(check.info === '"No object"') {
        return false;
      }
      return getApiNode(parentPath);
    };
    for(var l=0,j=infoLines.length;l<j;l++) {
      var line = infoLines[l];
      var splitLine = line.split(' ');

      var name = splitLine[1];
      if(line.indexOf('property') === 0 && splitLine[2] && splitLine[2].indexOf('Device') === -1) {
        _addProperty(name);
      } else if(line.indexOf('function') === 0) {
        _addFunction(name);
      } else if(line.indexOf('child') === 0 || (splitLine[2] && splitLine[2].indexOf('Device') === 0)) {
        _addChildProperty(name, (line.indexOf('children') === 0));
      }
    }
  }
}

return ApiNode;

})();


/** fin */

function isEmpty(obj) {
    for(var key in obj) {
        if(obj.hasOwnProperty(key))
            return false;
    }
    return true;
}

function log() {
  for(var i=0,len=arguments.length; i<len; i++) {
    var message = arguments[i];
    if(message && message.toString) {
      var s = message.toString();
      if(s.indexOf("[object ") >= 0) {
        s = JSON.stringify(message);
      }
      //outlet(3, s);
      post(s);
    }
    else if(message === null) {
	  //outlet(3, "<null>");
      post("<null>");
    }
    else {
	  //outlet(3, message);
      post(message);
    }
  }
  //outlet(3, "\n");
  post("\n");
}

log("___________________________________________________");
log("Reload:", new Date);

function inArray(target, array)
{
/* Caching array.length doesn't increase the performance of the for loop on V8 (and probably on most of other major engines) */
  for(var i = 0; i < array.length; i++) 
  {
    if(array[i] == target)
    {
      return true;
    }
  }
  return false; 
}

function isEmpty(obj) {
    for(var key in obj) {
        if(obj.hasOwnProperty(key))
            return false;
    }
    return true;
}

function bang () {
  var _device = new Explorer('this_device');
  var group_track = _device.getParent();
  var thisDeviceTrack = Number(group_track.getId());
  init_group_track(thisDeviceTrack);
}
	
function init_group_track (_group_track_id) {
  this.liveSet = new Explorer('live_set');
  var this_group_track = new Explorer("id " + _group_track_id);
  this.id = _group_track_id;
  this.unmuted = 0;
  this.subTracks = {};
  this.observers = {};
  this.init = 0;
  this.allTracks = "";
  // install a track observer
  set_tracks = liveSet.getTracks();
  this.theTracksObserver = new Explorer("live_set", tracksObserver, "tracks");
}


function tracksObserver(my_track) {
	// observer gets called when installed and 
    // when the tracks list changes
    // we just reflect the message across all device instances
    // via the shared send/receive object   
	// strip the list down to a sorted list of tracks
	var args = Array.prototype.slice.call(my_track);
	if (args[0] == "tracks") {
	  var allTracks = args.filter (function(v) {
	    return !((v == "id") || (v == "tracks"));
	  }).sort(function(a, b){return a-b});
      outlet(2, "dotrackchange", String(allTracks));
    }
}

function dotrackchange(theTracks) {
    var args = theTracks.split(",");
    var myTracks = args.filter (function(v) {
      return !(v == ",");
    }).sort(function(a, b){return a-b});
    // thisDeviceTrack is the track group track
    // run through all the elements of group_track[thisDeviceTrack].subTracks
    // and remove any that is not in theTracks
    Object.keys(this.subTracks).forEach(function(asubTrack) {
      if (inArray(asubTrack, myTracks) == false) {
        this.observers[asubTrack].property = "";
        delete this.observers[asubTrack];
        delete this.subTracks[asubTrack];
        if (this.unmuted == asubTrack) {
          this.unmuted = Object.keys(this.subTracks)[0];
          outlet(1, "dounmute", this.unmuted);
          outlet(0, "text", "");
        }
      }
    }, this);
    // run through all the tracks	
    myTracks.forEach(function(aTrackId, i) {
      var thisTrack = new Explorer("id "+ aTrackId);
      if (thisTrack.getIsGrouped() == 1) {
        var thisTrackGroupId = thisTrack.getGroupTrack().getId();
        if (thisTrackGroupId == this.id) {
          if (!inArray(aTrackId, Object.keys(this.subTracks))) {
            this.subTracks[aTrackId] = thisTrack;
            domuteobserver (aTrackId);
            if (thisTrack.getMute() == 0) {
              if (this.unmuted == 0) {
                outlet(0, "text", thisTrack.getName());
                this.unmuted = Number(aTrackId);
              } else {
                if (this.unmuted != Number(aTrackId)) {
                  outlet(1, "domute", aTrackId);
                }
              }
            }
          }                
        }
      }
    }, this);
    this.allTracks = theTracks;
    this.init = 1;
}

function trackObserver (my_mute_id) {
	var args = Array.prototype.slice.call(my_mute_id);
    if (args[0] == "mute") {
      outlet(1, "trackObserverAction", this.id);
    }
}

function trackObserverAction (_message) {
    var _actiontrack = Number(_message);
	if ( this.subTracks[_actiontrack].getMute() == 1) {
	  if (_actiontrack == this.unmuted) {
	    outlet(1, "dounmute", this.unmuted);
	  }
	} else {
	  if ( this.unmuted == 0) {
		this.unmuted = Number(_actiontrack);
		outlet(0, "text", this.subTracks[_actiontrack].getName());
	  } else {
		if (_actiontrack != this.unmuted) {
     	  outlet(0, "text", this.subTracks[_actiontrack].getName());
		  outlet(1, "domute", this.unmuted);
	      this.unmuted = _actiontrack;
	    }
	  }
	}
}

function domute(_message) {
  var _tomute = _message;
  this.subTracks[_tomute].setMute(1);
}

function dounmute(_message) {
  var _tomute = _message;
  this.subTracks[_tomute].setMute(0);
}


function domuteobserver(_message) {
  var _toobservetrack = "id " + _message;
  this.observers[_message] = new Explorer(_toobservetrack, trackObserver, "mute");
}