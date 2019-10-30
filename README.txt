Max4Live Exclusive device

This device is placed on a group track. All of the subtracks in the group will be muted, apart from one.
As tracks are unmuted, the other tracks will be muted - there can be only one.

The intention is that this will be used for controlling a set with ClyphX Pro.
ClyphX can be set to not run actions on muted tracks, so using Exclusive allows
one (and only one) ClyphX action to be selected per Scene. 
Because the device uses observers, any midi or keyboard setting can be attached to 
the track mute buttons.
This way a set of scenes can be navigated, looped, skipped or jumped as defined in a 
group of subtracks that can be folded away and monitored from the group track.

Thanks to Jannik Lemberg for 
/**
 * lapiexplore.js
 * written by Jannik Lemberg in 2015
**/
which really helped me get to grips with the LiveAPI.

I really learned alot in this build - JavaScript for one.
To handle multiple instances of the same device in the set with a track observer,
I set up a shared send/receive pair so I could reflect the track changes between
instances.
I also used another send/receive pair to log messages from multiple instances
into another device in the master track, so I got logging from all the instances
into the console at once. 