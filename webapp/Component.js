jQuery.sap.declare("legacyViewer.Component");
jQuery.sap.require("sap.ui.core.UIComponent");
jQuery.sap.require("sap.ca.scfld.md.ConfigurationBase");
jQuery.sap.require("sap.ca.scfld.md.ComponentBase");

	sap.ui.core.UIComponent.extend("legacyViewer.Component", {
		metadata : {		
		"name": "Legacy Viwer", 
		"version" : "0.0.1",
		"includes":["custom.css", "util.js"],
		"config" : {
			"resourceBundle" : "i18n/i18n.properties",
			"titleResource" : "Legacy Viewer",
			"icon" : "sap-icon://Fiori2/F0021",
			"favIcon" : "./resources/sap/ca/ui/themes/base/img/favicon/Approve_Requests.ico", //FIXME: should use F0392, but resource is not like that for W1s
			"homeScreenIconPhone" : "./resources/sap/ca/ui/themes/base/img/launchicon/Approve_Requests/57_iPhone_Desktop_Launch.png", //FIXME: should use F0392, but resource is not like that for 
			"homeScreenIconPhone@2" : "./resources/sap/ca/ui/themes/base/img/launchicon/Approve_Requests/114_iPhone-Retina_Web_Clip.png", //FIXME: should use F0392, but resource is not like that for 
			"homeScreenIconTablet" : "./resources/sap/ca/ui/themes/base/img/launchicon/Approve_Requests/72_iPad_Desktop_Launch.png", //FIXME: should use F0392, but resource is not like that for 
			"homeScreenIconTablet@2" : "./resources/sap/ca/ui/themes/base/img/launchicon/Approve_Requests/144_iPad_Retina_Web_Clip.png", //FIXME: should use F0392, but resource is not like that for 
			"startupImage320x460" : "./resources/sap/ca/ui/themes/base/img/splashscreen/320_x_460.png",
			"startupImage640x920" : "./resources/sap/ca/ui/themes/base/img/splashscreen/640_x_920.png",
			"startupImage640x1096" : "./resources/sap/ca/ui/themes/base/img/splashscreen/640_x_1096.png",
			"startupImage768x1004" : "./resources/sap/ca/ui/themes/base/img/splashscreen/768_x_1004.png",
			"startupImage748x1024" : "./resources/sap/ca/ui/themes/base/img/splashscreen/748_x_1024.png",
			"startupImage1536x2008" : "./resources/sap/ca/ui/themes/base/img/splashscreen/1536_x_2008.png",
			"startupImage1496x2048" : "./resources/sap/ca/ui/themes/base/img/splashscreen/1496_x_2048.png"
		}
	},
	createContent : function() {
        jQuery.getJSON( "/sap/opu/odata/sap/ZFIORI_LEGACY_VIEWER_SRV/Summary", function(data) {          	      		
        		// $("#legacyViewer")[0].src = data.d.backendHost + getUrlParameter("url")  + "?sap-theme=sap_bluecrystal";
        		$("#legacyViewer")[0].src = data.d.backendHost + getExternalUrl();
        });

        //custom iFrame rendering control
        jQuery.sap.declare("convergent.iframe");
        sap.ui.core.Control.extend("convergent.iframe", {
            metadata: {
                properties: {
                    src: {type: 'string'}
                },
                events: {}
            },
            renderer: function (oRm, oControl) {
            	oRm.write('<iframe id="legacyViewer" frameBorder="0"></iframe>');
            }
        });

        var Page = new sap.m.Page({
            title: decodeURIComponent(getApplicationTitle()),
            showNavButton: true,
            navButtonPress: function () {
            	$("#homeBtn").children().trigger( "click" );
            },
            content: new convergent.iframe()
        }).addStyleClass("wdaContent");

        if (sap.ui.Device.system.phone) {
            Page.setSubHeader(new sap.m.Bar({
                contentMiddle: new sap.m.Text({
                    text: "This page may not look right on smaller screens"
                })
            }));
        }

        return new sap.m.App({
            pages: [
                Page
            ]
        });        
	}
		
});