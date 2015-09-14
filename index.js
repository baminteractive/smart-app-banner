var extend = require('xtend/mutable');
var q = require('component-query');
var doc = require('get-doc');
var root = doc && doc.documentElement;
var cookie = require('cookie-cutter');
var ua = require('ua-parser-js');
var userLang = navigator.language.slice(-2) || navigator.userLanguage.slice(-2) || 'us';
var iosUrl = outlookCom.iOSUrl;
var andUrl = outlookCom.androidUrl;

// platform dependent functionality
var mixins = {
	ios: {
		iconRels: ['apple-touch-icon-precomposed', 'apple-touch-icon'],
		getStoreLink: function() {
			return iosUrl;
		}
	},
	android: {
		iconRels: ['android-touch-icon', 'apple-touch-icon-precomposed', 'apple-touch-icon'],
		getStoreLink: function() {
			return andUrl;
		}
	}
};

var SmartBanner = function(options) {
	var agent = ua(navigator.userAgent);
	this.options = extend({}, {
		daysHidden: 15,
		daysReminder: 90,
		appStoreLanguage: userLang, // Language code for App Store
		button: 'OPEN', // Text for the install button
		store: {
			ios: 'On the App Store',
			android: 'In Google Play'
		},
		price: {
			ios: 'FREE',
			android: 'FREE'
		},
		force: false // put platform type (ios, android, etc.) here for emulation
	}, options || {});

	if (this.options.force) {
		this.type = this.options.force;
	//iOS >= 6 has native support for SmartAppBanner
	} else if (agent.os.name === 'iOS') {
		this.type = 'ios';
	} else if (agent.os.name === 'Android') {
		this.type = 'android';
	}

	// Don't show banner if device isn't iOS or Android, website is loaded in app, user dismissed banner, or we have no app id in meta
	if (!this.type
		|| navigator.standalone
		|| cookie.get('smartbanner-closed')
		|| cookie.get('smartbanner-installed')) {
		return;
	}

	extend(this, mixins[this.type]);

	this.create();
	this.show();
};

SmartBanner.prototype = {
	constructor: SmartBanner,

	create: function() {
		var link = this.getStoreLink();
		var inStore = this.options.price[this.type] + ' - ' + this.options.store[this.type];
		var icon;
		for (var i = 0; i < this.iconRels.length; i++) {
			var rel = q('link[rel="'+this.iconRels[i]+'"]');
			if (rel) {
				icon = rel.getAttribute('href');
				break;
			}
		}

		var sb = doc.createElement('div');
		sb.className = 'smartbanner smartbanner-' + this.type;

		sb.innerHTML = '<div class="smartbanner-container">' +
							'<a href="javascript:void(0);" class="smartbanner-close" data-atlas="smartbanner close">&times;</a>' +
							'<span class="smartbanner-icon" style="background-image: url('+icon+')"></span>' +
							'<div class="smartbanner-info">' +
								'<div class="smartbanner-title">'+this.options.title+'</div>' +
								'<div>'+this.options.author+'</div>' +
								'<span>'+inStore+'</span>' +
							'</div>' +
							'<a href="'+link+'" class="smartbanner-button" data-atlas="smartbanner view">' +
								'<span class="smartbanner-button-text">'+this.options.button+'</span>' +
							'</a>' +
						'</div>';

		//there isn’t neccessary a body
		if (doc.body) {
			doc.body.appendChild(sb);
		}
		else if (doc) {
			doc.addEventListener('DOMContentLoaded', function(){
				doc.body.appendChild(sb);
			});
		}

		q('.smartbanner-button', sb).addEventListener('click', this.install.bind(this), false);
		q('.smartbanner-close', sb).addEventListener('click', this.close.bind(this), false);

	},
	hide: function() {
		root.classList.remove('smartbanner-show');
	},
	show: function() {
		root.classList.add('smartbanner-show');
	},
	close: function() {
		this.hide();
		cookie.set('smartbanner-closed', 'true', {
			path: '/',
			expires: +new Date() + this.options.daysHidden * 1000 * 60 * 60 * 24
		});
	},
	install: function() {
		this.hide();
		cookie.set('smartbanner-installed', 'true', {
			path: '/',
			expires: +new Date() + this.options.daysReminder * 1000 * 60 * 60 * 24
		});
	}
};

module.exports = SmartBanner;
