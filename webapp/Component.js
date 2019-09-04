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
	"sap/m/Button",
	"sap/m/ToolbarSpacer",
	"sap/ui/core/Fragment"
], function (UIComponent, App, Page, Bar, Text, Control, Toolbar, ComboBox, ListItem, Label, Dialog, Button, ToolbarSpacer, Fragment) {
	"use strict";
	return UIComponent.extend("legacyViewer.Component", {
		metadata: {
			manifest: "json"
		},
		init: function () {
			UIComponent.prototype.init.apply(this, arguments);
			this.setShellTitle();
			this.readAllData();
			//JSON Model to store local data
			this.localModel = this.getModel("localData");
			this.localModel.setData({
				selectedCompanyKey: "",
				selectedFacilityKey: ""
			});
		},
		createContent: function () {
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
					// oRm.write('<iframe sandbox="allow-same-origin allow-scripts allow-popups allow-forms" id="legacyViewer" frameBorder="0" ></iframe>');
					oRm.write('<iframe id="legacyViewer" frameBorder="0" ></iframe>');
				}
			});
			//SAPUI5 already has https://github.com/medialize/URI.js in it. So using this library to read URL parameters
			var currentURI = new URI(location.hash.substr(1));
			this.hasCompanyContext = (currentURI.query(true)["HasCompanyContext"] === "true");
			var oPage = new Page({
				showHeader: this.hasCompanyContext,
				content: new convergent.iframe()
			}).addStyleClass("wdaContent");

			//Add a company context if required
			if (this.hasCompanyContext) {
				Fragment.load({
					name: "legacyViewer.ContextFragment",
					controller: this
				}).then(function (headerContent) {
					headerContent.addStyleClass("sapUiMediumMarginBegin");
					var headerToolbar = new Toolbar({
						content: [new ToolbarSpacer(), headerContent]
					});
					this.setCustomHeader(headerToolbar);
				}.bind(oPage));
			}
			return new App({
				pages: [
					oPage
				]
			});
		},
		readAllData: function () {
			var that = this;
			Promise.all([this.readDefaultData(),
				this.readLegacyAppDetail()
			]).then(that.updateIframe.bind(that),
				that.handleError.bind(that));
		},
		handleError: function (error) {
			var dialog = new Dialog({
				title: 'Error',
				type: 'Message',
				state: 'Error',
				content: new Text({
					text: error
				}),
				beginButton: new Button({
					text: 'OK',
					press: function () {
						dialog.close();
					}
				}),
				afterClose: function () {
					dialog.destroy();
					//Navigate to FLP
					var oCrossAppNav = sap.ushell.Container.getService("CrossApplicationNavigation");
					oCrossAppNav.hrefForExternal({
						target: {
							shellHash: "#"
						}
					});
				}
			});
			dialog.open();
		},
		readLegacyAppDetail: function () {
			var applicationID = this.getComponentData().startupParameters.ApplicationID[0];
			return new Promise(
				function (resolve, reject) {
					this.getModel("LegacyApplicationDetail").callFunction("/Summary", {
						"method": "GET",
						urlParameters: {
							"ApplicationID": applicationID
						},
						success: function (oData, oResponse) {
							resolve(oData);
						},
						error: function (oError) {
							reject("Technical error: Failed to get app details");
						}
					});
				}.bind(this));
		},
		readDefaultData: function () {
			this.hasCompanyContext = (this.getComponentData().startupParameters.HasCompanyContext[0] === "true");
			if (!this.hasCompanyContext) {
				return false; //No company context to handle
			}
			var defaultCompanyID = jQuery.sap.storage.Storage.get("DefaultCompanyID");
			var defaultFacilityID = jQuery.sap.storage.Storage.get("DefaultFacilityID");
			var defaultSAPCompanyID = jQuery.sap.storage.Storage.get("DefaultSAPCompanyID");
			var defaultSAPFacilityID = jQuery.sap.storage.Storage.get("DefaultSAPFacilityID");
			if (defaultCompanyID && defaultCompanyID !== "") {
				return { //Company context was already fetched
					"CompanyID": defaultCompanyID,
					"FacilityID": defaultFacilityID,
					"SAPCompanyID": defaultSAPCompanyID,
					"SAPFacilityID": defaultSAPFacilityID
				};
			}

			return this.getCRMDefaults();
		},
		getCRMDefaults: function () {
			return new Promise( //Read the defaults
				function (resolve, reject) {
					this.getModel("CompanyContext").read("/UserDefaults('')", {
						success: function (oData) {
							if (!oData.CompanySearchTerm1 || !oData.CMFLocationID) {
								reject("Technical error: Failed to fetch the default company context from CRM");
							}
							resolve(this.getLegacyValues(oData).then(this.updateLocalData));
						}.bind(this),
						error: function (oError) {
							reject("Technical error: Failed to fetch the default company context from CRM");
						}
					});
				}.bind(this));
		},
		updateLocalData: function (data) {
			jQuery.sap.storage.Storage.put("DefaultCompanyID", data.CompanyID);
			jQuery.sap.storage.Storage.put("DefaultFacilityID", data.FacilityID);
			jQuery.sap.storage.Storage.put("DefaultSAPCompanyID", this.SAPCompanyID);
			jQuery.sap.storage.Storage.put("DefaultSAPFacilityID", this.SAPFacilityID);
		},
		getLegacyValues: function (oData) {
			return new Promise(
				function (resolve, reject) {
					$.ajax({
							url: "/cpcustomerstation/company/getCompanyFacilitySADBData",
							method: "GET",
							data: {
								chopCode: oData.CompanySearchTerm1,
								cmfFacilityId: oData.CMFLocationID
							}
						})
						.done(function (data) {
							// jQuery.sap.storage.Storage.put("DefaultCompanyID", data.company.id);
							// jQuery.sap.storage.Storage.put("DefaultFacilityID", data.facility.id);
							// jQuery.sap.storage.Storage.put("DefaultSAPCompanyID", this.CompanyID);
							// jQuery.sap.storage.Storage.put("DefaultSAPFacilityID", this.FacilityID);
							resolve({
								"CompanyID": data.company.id,
								"FacilityID": data.facility.id,
								"SAPCompanyID": this.CompanyID,
								"SAPFacilityID": this.CompanyID
							});
						}.bind(oData))
						.fail(function (error) {
							reject("Technical error: Failed to fetch the legacy company context from CS");
						});
				});
		},
		updateIframe: function (values) {
			this.oDefaultData = values[0];
			this.oLegacyAppDetail = values[1];
			if (this.hasCompanyContext) {
				this.updateModel(this.oDefaultData.SAPCompanyID, this.oDefaultData.SAPFacilityID);
				this.filterFacilities();
			}
			this.updateURL(this.oDefaultData.CompanyID, this.oDefaultData.FacilityID, this.oLegacyAppDetail.CompanyURLParameterName, this
				.oLegacyAppDetail
				.FacilityURLParameterName, this.oLegacyAppDetail.ApplicationURL);
		},
		setShellTitle: function () {
			this.getService("ShellUIService").then( // promise is returned
				function (oService) {
					var sTitle = this.getComponentData().startupParameters.Title[0];
					oService.setTitle(sTitle);
				}.bind(this),
				function (oError) {
					jQuery.sap.log.error("Cannot get ShellUIService", oError);
				}
			);
		},
		updateURL: function (CompanyID, FacilityID, CompanyURLParameterName, FacilityURLParameterName, URL) {
			//SAPUI5 already has https://github.com/medialize/URI.js in it. So using this library to change URL parameters
			if (!URL) {
				var iframeUrl = new URI($("#legacyViewer").attr("src"));
			} else {
				iframeUrl = new URI(URL);
			}

			if (CompanyURLParameterName) {
				iframeUrl.setQuery(CompanyURLParameterName, CompanyID);
			}
			if (FacilityURLParameterName) {
				iframeUrl.setQuery(FacilityURLParameterName, FacilityID);
			}

			//Set the URL back to iframe
			$("#legacyViewer").attr("src", iframeUrl);
		},
		updateModel: function (CompanyID, FacilityID) {
			this.localModel.setData({
				selectedCompanyKey: CompanyID,
				selectedFacilityKey: FacilityID
			});
			//Store locally
			jQuery.sap.storage.Storage.put("DefaultCompanyID", CompanyID);
			jQuery.sap.storage.Storage.put("DefaultFacilityID", FacilityID);
		},
		updateContext: function (evt) {
			var CompanyID = sap.ui.getCore().byId("companyComboBoxID").getSelectedItem().getBindingContext("CompanyContext").getObject().SearchTerm1;
			var SAPCompanyID = sap.ui.getCore().byId("companyComboBoxID").getSelectedItem().getBindingContext("CompanyContext").getObject().CompanyID;
			var FacilityID = sap.ui.getCore().byId("facilityComboBoxID").getSelectedItem().getBindingContext("CompanyContext").getObject().CMFLocationID;
			var SAPFacilityID = sap.ui.getCore().byId("facilityComboBoxID").getSelectedItem().getBindingContext("CompanyContext").getObject().FacilityID;

			//Get Legacy IDs
			this.getLegacyValues({
				CompanySearchTerm1: CompanyID,
				CMFLocationID: FacilityID,
				CompanyID: SAPCompanyID,
				FacilityID: SAPFacilityID
			}).then(function (data) {
				this.updateURL(data.CompanyID, data.FacilityID, this.oLegacyAppDetail.CompanyURLParameterName, this.oLegacyAppDetail
					.FacilityURLParameterName, null);
			}.bind(this));
			// this.updateURL(CompanyID, FacilityID, this.oLegacyAppDetail.CompanyURLParameterName, this.oLegacyAppDetail
			// 	.FacilityURLParameterName, null);			
		},
		filterFacilities: function () {
				var facilityComboBox = sap.ui.getCore().byId("facilityComboBoxID");
				facilityComboBox.bindElement({
					path: "/Companies('" + this.getModel("localData").getProperty("/selectedCompanyKey") + "')",
					model: "CompanyContext"
				});
			}
			// updateContext: function (evt) {
			// 	//Legacy app context needs to be updated
			// 	//SAPUI5 already has https://github.com/medialize/URI.js in it. So using this library to change URL parameters
			// 	var iframeUrl = $("#legacyViewer").attr("src");
			// 	var localModel = this.getModel("localData");
			// 	var currentCompany = localModel.getProperty("/selectedCompanyKey");
			// 	var currentFacility = localModel.getProperty("/selectedFacilityKey");
			// 	iframeUrl.setQuery("company", currentCompany);
			// 	iframeUrl.setQuery("facility", currentFacility);

		// 	//Set the URL back to iframe
		// 	$("#legacyViewer").attr("src", iframeUrl);
		// }
	});
});