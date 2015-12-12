define(function() {
    function MessageBus() {
        this.channels = {};
        this.subscribers = [];
    }

    MessageBus.prototype.registerOnChannel = function (channel, obj) {
        if (typeof(channel) != "string") return;
        
        if (!this.channels.hasOwnProperty(channel)) this.channels[channel] = [ obj ];
        else this.channels[channel].push(obj);

        if (this.subscribers.indexOf(obj) == -1) this.subscribers.push(obj);
    }

    MessageBus.prototype.sendMessage = function (channel, message) {
        console.log(this.channels);
        var channelsubs = this.channels[channel];
        for (var i = 0; i < channelsubs.length; ++i) {
            channelsubs[i].receiveMessage(channel, message);
        }
    }

    MessageBus.prototype.broadcastMessage = function(message) {
        for (var i = 0; i < this.subscribers.length; ++i) {
            this.subscribers[i].receiveMessage("",message);
        }
    }
    
    return MessageBus;
});
