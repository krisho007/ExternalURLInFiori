sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/m/App",
	"sap/m/Page",
	"sap/m/Bar",
	"sap/m/Text",
	"sap/ui/core/Control",
	"sap/m/Toolbar",
	"sap/m/ComboBox",
	"sap/ui/core/ListItem",
	"sap/m/Label",
	"sap/m/Dialog",
	"sap/m/Button"
], function (UIComponent, App, Page, Bar, Text, Control, Toolbar, ComboBox, ListItem, Label, Dialog, Button) {
	"use strict";
	return UIComponent.extend("legacyViewer.Component", {
		metadata: {
			manifest: "json"
		},
		createContent: function () {
			//JSON Model to store local data
			var localModel = this.getModel("localData");
			localModel.setData({
				selectedCompanyKey: "",
				selectedFacilityKey: ""
			});
			
			//SAPUI5 already has https://github.com/medialize/URI.js in it. So using this library to read URL parameters
			var currentURI = new URI(location.hash.substr(1));
			
			jQuery.getJSON("/sap/opu/odata/sap/ZFIORI_LEGACY_VIEWER_SRV/Summary", function (data) {
				$("#legacyViewer")[0].src = data.d.BackendHost + currentURI.query(true)["url"];
			});

			//Update the app title dynamically
			this.getService("ShellUIService").then( // promise is returned
				function (oService) {
					var sTitle = currentURI.query(true)["title"];
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

			var hasCompanyContext = ( currentURI.query(true)["hasCompanyContext"] === "true");
			var oPage = new Page({
				showHeader: hasCompanyContext,
				content: new convergent.iframe()
			}).addStyleClass("wdaContent");

			//Add a company context if required
			if (hasCompanyContext) {
				var dropdownTemplate = new ListItem({
					key: "{id}",
					text: "{name}"
				});
				var companyLabel = new Label({
					text: "Company"
				});
				var facilityLabel = new Label({
					text: "Facility"
				});
				this.companyDD = new ComboBox({
					"items": {
						"path": "/Companies",
						"template": dropdownTemplate
					},
					"selectedKey": "{localModel>/selectedCompanyKey}",
					"press": this.filterFacilities
				});

				this.facilityDD = new ComboBox({
					"items": {
						"path": "Facilities",
						"template": dropdownTemplate
					},
					"selectedKey": "{localModel>/selectedFacilityKey}",
					"press": this.updateContext
				});
				var headerToolbar = new Toolbar({
					content: [companyLabel, this.companyDD, facilityLabel, this.facilityDD]
				});

				oPage.setCustomHeader(headerToolbar);

				//Popup to choose company and facility
				this.oDialog = new Dialog({
					title: "Choose Company and Facility",
					content: [companyLabel.clone().addStyleClass("sapUiTinyMarginBegin"), this.companyDD.clone().addStyleClass(
						"sapUiTinyMarginBegin"), facilityLabel.clone().addStyleClass("sapUiMediumMarginBegin"), this.facilityDD.clone().addStyleClass(
						"sapUiTinyMarginBegin").addStyleClass("sapUiSmallMarginEnd")],
					endButton: new Button({
						text: "OK",
						press: function () {
							this.getParent().oDialog.close();
						}
					})
				});
				this.oDialog.open();
			}

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
		},
		filterFacilities: function (evt) {
			//Set Binding context of facilities
			var facilityComboBox = evt.getSource().getParent().getContent()[1];
			var currentSelectedBindingContext = evt.getSource().getSelectedItem().getBindingContext();
			facilityComboBox.setBindingContext(currentSelectedBindingContext);
		},
		updateContext: function (evt) {
			//Legacy app context needs to be updated
			//SAPUI5 already has https://github.com/medialize/URI.js in it. So using this library to change URL parameters
			var iframeUrl = $("#legacyViewer")[0].attr("src");
			var localModel = this.getModel("localData");
			var currentCompany = localModel.getProperty("/selectedCompanyKey");
			var currentFacility = localModel.getProperty("/selectedFacilityKey");
			iframeUrl.setQuery("company", currentCompany);
			iframeUrl.setQuery("facility", currentFacility);
			
			//Set the URL back to iframe
			$("#legacyViewer")[0].attr("src", iframeUrl);
		}
	});
});