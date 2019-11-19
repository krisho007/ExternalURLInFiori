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
			this.resourceBundle = this.getModel("i18n").getResourceBundle();
			if (this.hasCompanyContext) {
				this.metadataFailed("CompanyContext").then(function (error) {
					this.handleError(this.resourceBundle.getText("CompanyContextServiceFailed"));
				}.bind(this));
			}
			this.metadataFailed("LegacyApplicationDetail").then(function (error) {
				this.handleError(this.resourceBundle.getText("CompanyContextServiceFailed"));
			}.bind(this));
			sap.ushell.Container.getRenderer("fiori2").hideHeaderItem("backBtn", false);
		},
		exit: function () {
			sap.ushell.Container.getRenderer("fiori2").showHeaderItem("backBtn", false);
		},
		metadataFailed: function (modelName) {
			var myODataModel = this.getModel(modelName); // from the descriptor
			var failedAlready = myODataModel.isMetadataLoadingFailed();
			return failedAlready ? Promise.resolve() : new Promise(function (resolve) {
				myODataModel.attachEventOnce("metadataFailed", resolve);
			});
		},
		createContent: function () {
			//SAPUI5 already has https://github.com/medialize/URI.js in it. So using this library to read URL parameters
			var currentURI = new URI(location.hash.substr(1));
			this.hasCompanyContext = (currentURI.query(true)["HasCompanyContext"] === "true");

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

					//Comboboxes cannot be typed in
					sap.ui.getCore().byId("companyComboBoxID").addEventDelegate({
						onAfterRendering: function () {
							sap.ui.getCore().byId("companyComboBoxID").$().find("input").attr("readonly", true);
						}
					});
					sap.ui.getCore().byId("facilityComboBoxID").addEventDelegate({
						onAfterRendering: function () {
							sap.ui.getCore().byId("facilityComboBoxID").$().find("input").attr("readonly", true);
						}
					});
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
					//Navigate to FLP - NOT WORKING
					// var oCrossAppNav = sap.ushell.Container.getService("CrossApplicationNavigation");
					// oCrossAppNav.hrefForExternal({
					// 	target: {
					// 		shellHash: "#"
					// 	}
					// });
					location.hash = "#Shell-home";
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
			var defaultSettingsForUser = jQuery.sap.storage.Storage.get("CurrentUser");
			var currentUser = sap.ushell.Container.getUser().getId();
			if (defaultCompanyID && defaultCompanyID !== "" && currentUser === defaultSettingsForUser) {
				//If facility id is not available, this is a intermodal user which does not need facility. Hide facility
				if (!defaultFacilityID) {
					this.getModel("localData").setProperty("/showFacility", false);
				}
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
							if (!oData.CompanySearchTerm1) {
								reject("Technical error: Failed to fetch the default company context from CRM");
							}
							if (!oData.CMFLocationID) {
								//If facility id is not available, this is a intermodal user which does not need facility. Hide facility
								this.getModel("localData").setProperty("/showFacility", false);
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
			jQuery.sap.storage.Storage.put("CurrentUser", sap.ushell.Container.getUser().getId());
		},
		getLegacyValues: function (oData) {
			return new Promise(
				function (resolve, reject) {
					var data = {};

					//URL parameters
					data["chopCode"] = oData.CompanySearchTerm1;
					if (oData.CMFLocationID) {
						data["cmfFacilityId"] = oData.CMFLocationID;
					}

					//Call legacy
					$.ajax({
							url: "/cpcustomerstation/company/getCompanyFacilitySADBData",
							method: "GET",
							data: data
						})
						.done(function (data) {
							resolve({
								"CompanyID": data.company.id,
								"FacilityID": (data.facility === null ? null : data.facility.id),
								"SAPCompanyID": this.CompanyID,
								"SAPFacilityID": this.FacilityID
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
			var showFacility = false;
			if (this.oLegacyAppDetail.ApplicationURL.search("vinmanagement") > -1) {
				this.getLiveSide().then(this.updateIframeWithVINUrl.bind(this));
				return;
			}
			if (this.oLegacyAppDetail.FacilityURLParameterName !== "" && this.oDefaultData.FacilityID) {
				showFacility = true;
			}
			if (this.hasCompanyContext) {
				this.updateModel(this.oDefaultData.SAPCompanyID, this.oDefaultData.SAPFacilityID, showFacility);
				this.filterFacilities();
			}
			this.updateURL(this.oDefaultData.CompanyID, this.oDefaultData.FacilityID,
				this.oLegacyAppDetail.CompanyURLParameterName, this.oLegacyAppDetail.FacilityURLParameterName,
				this.oLegacyAppDetail.ApplicationURL);
		},
		getLiveSide: function () {
			return new Promise(function (resolve, reject) {
				$.ajax({
						url: "/cpcustomerstation/util/getLiveSide",
						method: "GET"
					})
					.done(function (data) {
						resolve(data.side);
					})
					.fail(function (error) {
						reject("Technical error: Failed to fetch the legacy company context from CS");
					});;
			});
		},
		updateIframeWithVINUrl: function (data) {
			var URL = this.oLegacyAppDetail.ApplicationURL;
			URL = URL.replace("$companyId", this.oDefaultData.CompanyID);
			URL = URL.replace("$server", data);
			var iframe = $("#legacyViewer");
			this.updateModel(this.oDefaultData.SAPCompanyID, null, false);
			// Loading indicator for iframe
			iframe.addClass("loadingIframe");
			//Set the URL back to iframe
			iframe.attr("src", URL);
			iframe.on("load", function () {
				iframe.removeClass("loadingIframe");
			});
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
			var iframe = $("#legacyViewer");
			var currentURL = iframe.attr("src");
			//For VIN Management URLs
			if (currentURL) {
				if (currentURL.search("vinmanagement") > -1) {
					this.updateIframeWithVINUrl(null);
					return;
				}
			}

			//SAPUI5 already has https://github.com/medialize/URI.js in it. So using this library to change URL parameters
			if (!URL) {
				var iframeUrl = new URI(currentURL);
			} else {
				iframeUrl = new URI(URL);
			}

			if (CompanyURLParameterName) {
				iframeUrl.setQuery(CompanyURLParameterName, CompanyID);
			}
			if (FacilityURLParameterName && FacilityID) {
				iframeUrl.setQuery(FacilityURLParameterName, FacilityID);
			}

			// Loading indicator for iframe
			iframe.addClass("loadingIframe");

			//Set the URL back to iframe
			iframe.attr("src", iframeUrl);

			iframe.on("load", function () {
				iframe.removeClass("loadingIframe");
			});
		},
		updateModel: function (CompanyID, FacilityID, showFacility) {
			this.localModel.setData({
				selectedCompanyKey: CompanyID,
				selectedFacilityKey: FacilityID,
				showFacility: showFacility
			});
		},
		updateContext: function (evt) {
			var CompanyID = sap.ui.getCore().byId("companyComboBoxID").getSelectedItem().getBindingContext("CompanyContext").getObject().SearchTerm1;
			var SAPCompanyID = sap.ui.getCore().byId("companyComboBoxID").getSelectedItem().getBindingContext("CompanyContext").getObject().CompanyID;
			try {
				var FacilityID = sap.ui.getCore().byId("facilityComboBoxID").getSelectedItem().getBindingContext("CompanyContext").getObject().CMFLocationID;
				var SAPFacilityID = sap.ui.getCore().byId("facilityComboBoxID").getSelectedItem().getBindingContext("CompanyContext").getObject().FacilityID;
			} catch (err) { //For apps which just have company, no facility will have errors in above try block
			}

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
		},
		filterFacilities: function () {
			var facilityComboBox = sap.ui.getCore().byId("facilityComboBoxID");
			facilityComboBox.bindElement({
				path: "/Companies('" + this.getModel("localData").getProperty("/selectedCompanyKey") + "')",
				model: "CompanyContext"
			});
		}
	});
});