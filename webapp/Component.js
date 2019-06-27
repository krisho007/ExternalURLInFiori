sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/m/App",
	"sap/m/Page",
	"sap/m/Bar",
	"sap/m/Text",
	"sap/ui/core/Control"
], function (UIComponent, App, Page, Bar, Text, Control) {
	"use strict";
	return UIComponent.extend("legacyViewer.Component", {
		metadata: {
			manifest: "json"
		},
		createContent: function () {
			jQuery.getJSON("/sap/opu/odata/sap/ZFIORI_LEGACY_VIEWER_SRV/Summary", function (data) {
				$("#legacyViewer")[0].src = data.d.BackendHost + getExternalUrl();
			});

			//Update the app title dynamically
			this.getService("ShellUIService").then( // promise is returned
				function (oService) {
					var sTitle = getApplicationTitle();
					oService.setTitle(sTitle);
				}.bind(this),
				function (oError) {
					jQuery.sap.log.error("Cannot get ShellUIService", oError);
				}
			);

			//Custom iFrame rendering control
			Control.extend("convergent.iframe", {
				metadata: {
					properties: {
						src: {
							type: "string"
						}
					},
					events: {}
				},
				renderer: function (oRm, oControl) {
					oRm.write('<iframe id="legacyViewer" frameBorder="0"></iframe>');
				}
			});

			var oPage = new Page({
				showHeader: false,
				content: new convergent.iframe()
			}).addStyleClass("wdaContent");

			if (sap.ui.Device.system.phone) {
				oPage.setSubHeader(new Bar({
					contentMiddle: new Text({
						text: "This page may not look right on smaller screens"
					})
				}));
			}

			return new App({
				pages: [
					oPage
				]
			});
		}
	});
});