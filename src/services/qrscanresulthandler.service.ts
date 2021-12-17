import { Inject, Injectable } from '@angular/core';
import { TelemetryGeneratorService } from './telemetry-generator.service';
import {
  FrameworkService,
  PageAssembleService,
  Content,
  ContentDetailRequest,
  ContentService,
  CorrelationData,
  TelemetryObject,
  TelemetryService,
} from 'sunbird-sdk';
import { EventTopics, RouterLinks,MimeType } from '../app/app.constant';

import { CommonUtilService } from './common-util.service';
import {
  Environment,
  ImpressionSubtype,
  ImpressionType,
  InteractSubtype,
  InteractType,
  Mode,
  PageId,
  ObjectType,
  CorReleationDataType,
} from './telemetry-constants';
import { NavigationExtras, Router } from '@angular/router';
import { NavController } from '@ionic/angular';
import { Events } from '@app/util/events';
import { AppGlobalService } from './app-global-service.service';
import { FormAndFrameworkUtilService } from './formandframeworkutil.service';
import { ContentUtil } from '@app/util/content-util';
import * as qs from 'qs';
import { NavigationService } from './navigation-handler.service';
import { FormConstants } from '@app/app/form.constants';
import { SbProgressLoader, Context as SbProgressLoaderContext  } from './sb-progress-loader.service';
import { CsPrimaryCategory } from '@project-sunbird/client-services/services/content';

declare var cordova;

@Injectable()
export class QRScannerResultHandler {
  private static readonly CORRELATION_TYPE = 'qr';
  source: string;
  inAppBrowserRef: any;
  scannedUrlMap: object;
  private progressLoaderId: string;
  private enableRootNavigation = false;
  constructor(
    @Inject('CONTENT_SERVICE') private contentService: ContentService,
    @Inject('TELEMETRY_SERVICE') private telemetryService: TelemetryService,
    @Inject('PAGE_ASSEMBLE_SERVICE') private pageAssembleService: PageAssembleService,
    @Inject('FRAMEWORK_SERVICE') private frameworkService: FrameworkService,
    private commonUtilService: CommonUtilService,
    private telemetryGeneratorService: TelemetryGeneratorService,
    private router: Router,
    private navCtrl: NavController,
    private events: Events,
    private appGlobalService: AppGlobalService,
    private formFrameWorkUtilService: FormAndFrameworkUtilService,
    private navService: NavigationService,
    private sbProgressLoader: SbProgressLoader
  ) {
  }

  async parseDialCode(scannedData: string): Promise<string | undefined> {
    const dailCodeRegExpression = await this.formFrameWorkUtilService.getDialcodeRegexFormApi();
    const execArray = (new RegExp(dailCodeRegExpression)).exec(scannedData);
    if (execArray && execArray.groups) {
      try {
        const url: URL = new URL(scannedData);
        const overrideChannelSlug = url.searchParams.get('channel');

        if (overrideChannelSlug) {
          this.frameworkService.searchOrganization({
            filters: {
              slug: overrideChannelSlug,
              isRootOrg: true
            } as any
          }).toPromise().then((result) => {
            const org: any = result.content && result.content[0];

            if (org) {
              this.pageAssembleService.setPageAssembleChannel({
                channelId: org.id
              });

              setTimeout(() => {
                this.events.publish(EventTopics.COURSE_PAGE_ASSEMBLE_CHANNEL_CHANGE);
              }, 500);
            }
          });
        }
      } catch (e) {
        console.error(e);
      }

      this.scannedUrlMap = execArray.groups;
      return execArray.groups[Object.keys(execArray.groups).find((key) => !!execArray.groups[key])];
    }
    return undefined;
  }

  isContentId(scannedData: string): boolean {
    const results = scannedData.split('/');
    const type = results[results.length - 2];
    const action = results[results.length - 3];
    const scope = results[results.length - 4];
    return (type === 'content' && scope === 'public') ||
      (action === 'play' && (type === 'collection' || type === 'content')) ||
      (action === 'explore-course' && type === 'course');
  }

  handleDialCode(source: string, scannedData, dialCode: string) {
    this.source = source;
    this.generateQRScanSuccessInteractEvent(scannedData, 'SearchResult', dialCode);
    const telemetryObject = new TelemetryObject(dialCode, 'qr', ' ');
    const utmUrl = scannedData.slice(scannedData.indexOf('?') + 1);
    const params: {[param: string]: string} = qs.parse(utmUrl);
    const cData: Array<CorrelationData> = [];

    if (utmUrl !== scannedData) {
      ContentUtil.genrateUTMCData(params).forEach((element) => {
        cData.push(element);
      });
    }
    const corRelationData: CorrelationData[] = [{
      id: CorReleationDataType.SCAN,
      type: CorReleationDataType.ACCESS_TYPE
    }];
    if (cData && cData.length) {
      this.telemetryService.updateCampaignParameters(cData);
      this.telemetryGeneratorService.generateUtmInfoTelemetry(params, PageId.QRCodeScanner, telemetryObject, corRelationData);
    }
    const navigationExtras: NavigationExtras = {
      state: {
        dialCode,
        corRelation: this.getCorRelationList(dialCode, QRScannerResultHandler.CORRELATION_TYPE, scannedData),
        source: this.source,
        shouldGenerateEndTelemetry: true
      }
    };
    this.generateImpressionEvent(this.source, dialCode);
    this.navCtrl.navigateForward([`/${RouterLinks.SEARCH}`], navigationExtras);
  }

  handleContentId(source: string, scannedData: string) {
    this.source = source;
    const results = scannedData.split('/');
    const contentId = results[results.length - 1];
    this.generateQRScanSuccessInteractEvent(scannedData, 'ContentDetail', contentId);
    const utmUrl = scannedData.slice(scannedData.indexOf('?') + 1);
    const params: {[param: string]: string} = qs.parse(utmUrl);
    const cData: CorrelationData[] = [];

    if (utmUrl !== scannedData) {
      ContentUtil.genrateUTMCData(params).forEach((element) => {
       cData.push(element);
     });
   }
    const request: ContentDetailRequest = {
      contentId
    };
    this.contentService.getContentDetails(request).toPromise()
      .then((content: Content) => {
        const corRelationData: CorrelationData[] = [{
          id: CorReleationDataType.SCAN,
          type: CorReleationDataType.ACCESS_TYPE
        }];
        if (cData && cData.length) {
          this.telemetryService.updateCampaignParameters(cData);
          this.telemetryGeneratorService.generateUtmInfoTelemetry(params,
            PageId.QRCodeScanner, ContentUtil.getTelemetryObject(content), corRelationData);
        }

        this.navigateToDetailsPage(content,
          this.getCorRelationList(content.identifier, QRScannerResultHandler.CORRELATION_TYPE, scannedData));
        this.telemetryGeneratorService.generateImpressionTelemetry(
          ImpressionType.VIEW, ImpressionSubtype.QR_CODE_VALID,
          PageId.QRCodeScanner,
          Environment.HOME,
          contentId, ObjectType.QR, ''
        );
      }).catch(() => {
        if (!this.commonUtilService.networkInfo.isNetworkAvailable) {
          this.commonUtilService.showToast('ERROR_NO_INTERNET_MESSAGE');
        } else {
          this.commonUtilService.showToast('UNKNOWN_QR');
          this.telemetryGeneratorService.generateImpressionTelemetry(
            ImpressionType.VIEW, ImpressionSubtype.INVALID_QR_CODE,
            PageId.QRCodeScanner,
            Environment.HOME,
            contentId, ObjectType.QR, ''
          );
        }
      });
  }

  handleCertsQR(source: string, scannedData: string) {
    this.generateQRScanSuccessInteractEvent(scannedData, 'OpenBrowser', undefined, {
      certificateId: scannedData.split('/certs/')[1], scannedFrom: 'mobileApp'
    });
    this.telemetryService.buildContext().subscribe(context => {
      scannedData = scannedData + '?clientId=android&context=' + encodeURIComponent(JSON.stringify(context));
      this.inAppBrowserRef = cordova.InAppBrowser.open(scannedData, '_blank', 'zoom=no');
      this.inAppBrowserRef.addEventListener('loadstart', (event) => {
        if (event.url) {
          if (event.url.includes('explore-course')) {
            this.inAppBrowserRef.close();
            this.events.publish('return_course');
          }
        }
      });
    });
  }

  handleInvalidQRCode(source: string, scannedData: string) {
    this.source = source;
    this.generateQRScanSuccessInteractEvent(scannedData, 'UNKNOWN');
    this.generateEndEvent(this.source, scannedData);
  }

  getCorRelationList(identifier: string, type: string, scannedData): Array<CorrelationData> {
    const corRelationList: Array<CorrelationData> = new Array<CorrelationData>();
    corRelationList.push({id: identifier, type});
    corRelationList.push({
      id: ContentUtil.extractBaseUrl(scannedData),
      type: CorReleationDataType.SOURCE
    });
    return corRelationList;
  }

  navigateToDetailsPage(content, corRelationList) {
    const navigationExtras: NavigationExtras = {
      state: {
        content,
        corRelation: corRelationList,
        source: this.source,
        shouldGenerateEndTelemetry: true
      }
    };

    this.navService.navigateToDetailPage(
      content,
      navigationExtras.state
    );
  }

  generateQRScanSuccessInteractEvent(scannedData, action, dialCode?, certificate?:
    { certificateId: string, scannedFrom: 'mobileApp' | 'genericApp' }) {
    const values = new Map();
    values['networkAvailable'] = this.commonUtilService.networkInfo.isNetworkAvailable ? 'Y' : 'N';
    values['scannedData'] = scannedData;
    values['action'] = action;
    values['compatibile'] = (action === 'OpenBrowser' || action === 'SearchResult' || action === 'ContentDetail') ? 1 : 0;
    if (this.scannedUrlMap) {
      values['dialCodeType'] = this.scannedUrlMap['sunbird'] ? 'standard' : 'non-standard';
    }
    let telemetryObject: TelemetryObject;

    if (dialCode) {
      telemetryObject = new TelemetryObject(dialCode, 'qr', undefined);
    }
    if (certificate) {
      values['scannedFrom'] = certificate.scannedFrom;
      telemetryObject = new TelemetryObject(certificate.certificateId, 'certificate', undefined);
    }

    const corRelationList: Array<CorrelationData> = [{
      id: ContentUtil.extractBaseUrl(scannedData),
      type: CorReleationDataType.SOURCE
    }];

    this.telemetryGeneratorService.generateInteractTelemetry(
      InteractType.OTHER,
      InteractSubtype.QRCodeScanSuccess,
      Environment.HOME,
      PageId.QRCodeScanner, telemetryObject,
      values,
      undefined,
      corRelationList
    );
  }

  generateEndEvent(pageId: string, qrData: string) {
    if (pageId) {
      const telemetryObject = new TelemetryObject(qrData, QRScannerResultHandler.CORRELATION_TYPE, undefined);
      this.telemetryGeneratorService.generateEndTelemetry(
        QRScannerResultHandler.CORRELATION_TYPE,
        Mode.PLAY,
        pageId,
        Environment.HOME,
        telemetryObject
      );
    }
  }

  private generateImpressionEvent(source, dialCode) {
    const corRelationList: Array<CorrelationData> = [];
    corRelationList.push({id: dialCode, type: CorReleationDataType.QR});
    this.telemetryGeneratorService.generateImpressionTelemetry(
      ImpressionType.PAGE_REQUEST, '',
      PageId.QR_BOOK_RESULT,
      source ? Environment.ONBOARDING : Environment.HOME, '', '', '',
      undefined,
      corRelationList);
  }

   // Lesser the value higher the priority
   private validateDeeplinkPriority(matchedDeeplinkConfig, config) {
    return (matchedDeeplinkConfig && !matchedDeeplinkConfig.priority && config.priority) ||
      (matchedDeeplinkConfig && matchedDeeplinkConfig.priority
        && config.priority && matchedDeeplinkConfig.priority > config.priority);
  }

  async manageLearScan(scannedData){
    const dailcode = await this.parseDialCode(scannedData);
    const deepLinkUrlConfig: { name: string, code: string, pattern: string, route: string, priority?: number, params?: {} }[] =
    await this.formFrameWorkUtilService.getFormFields(FormConstants.DEEPLINK_CONFIG);
    let matchedDeeplinkConfig: { name: string, code: string, pattern: string, route: string, priority?: number } = null;
    let urlMatch;
    deepLinkUrlConfig.forEach(config => {
      const urlRegexMatch = scannedData.match(new RegExp(config.pattern));
      if (!!urlRegexMatch && (!matchedDeeplinkConfig || this.validateDeeplinkPriority(matchedDeeplinkConfig, config))) {
        if (config.code === 'profile' && !this.appGlobalService.isUserLoggedIn()) {
          config.route = 'tabs/guest-profile';
        }
        matchedDeeplinkConfig = config;
        urlMatch = urlRegexMatch;
      }
    });

    if (!matchedDeeplinkConfig) {
      return;
    }
    let identifier;
    if (urlMatch && urlMatch.groups && Object.keys(urlMatch.groups).length) {
      identifier = urlMatch.groups.quizId || urlMatch.groups.content_id || urlMatch.groups.course_id;
    }
    const attributeConfig = deepLinkUrlConfig.find(config => config.code === 'attributes');
    this.handleNavigation(scannedData, identifier, dailcode, matchedDeeplinkConfig, attributeConfig.params['attributes'], urlMatch.groups);
  }
  private async handleNavigation(payloadUrl, identifier, dialCode, matchedDeeplinkConfig, attributeList, urlMatchGroup) {
    const route = matchedDeeplinkConfig.route;
      let extras = {};
      const request = this.getRequest(payloadUrl, matchedDeeplinkConfig, attributeList);
      if (request && (request.query || request.filters && Object.keys(request.filters).length)) {
        extras = {
          state: {
            source: PageId.SPLASH_SCREEN,
            preAppliedFilter: {
              query: request.query || '',
              filters: {
                status: ['Live'],
                objectType: ['Content'],
                ...request.filters
              }
            }
          }
        };
      } else if (matchedDeeplinkConfig &&
        matchedDeeplinkConfig.pattern && matchedDeeplinkConfig.pattern.includes('manage-learn')) {
          extras = {
            state: {
              data: urlMatchGroup
            }
          };
      }
      this.setTabsRoot();
      this.navCtrl.navigateForward([route], extras);
      this.closeProgressLoader();
  }
  async navigateContent(
    identifier, isFromLink = false, content?: Content | null,
    payloadUrl?: string, route?: string, coreRelationList?: Array<CorrelationData>
  ) {
    try {
      this.appGlobalService.resetSavedQuizContent();
       if (content) {
        if (!route) {
           route = this.getRouterPath(content);
        }
          this.setTabsRoot();
            await this.router.navigate([route],
              {
                state: {
                  content,
                  corRelation: this.getCorrelationList(payloadUrl, coreRelationList)
                }
              });
      } else {
        if (!this.commonUtilService.networkInfo.isNetworkAvailable) {
          this.commonUtilService.showToast('NEED_INTERNET_FOR_DEEPLINK_CONTENT');
          this.appGlobalService.skipCoachScreenForDeeplink = false;
          this.closeProgressLoader();
          return;
        }
      }
    } catch (err) {
      this.closeProgressLoader();
      console.log(err);
    }
  }
  private closeProgressLoader() {
    this.sbProgressLoader.hide({
      id: this.progressLoaderId
    });
    this.progressLoaderId = undefined;
  }
  private getRequest(payloadUrl: string, matchedDeeplinkConfig, attributeList) {
    if (!matchedDeeplinkConfig.params || !Object.keys(matchedDeeplinkConfig.params).length) {
      return undefined;
    }

    const url = new URL(payloadUrl);
    const request: {
      query?: string;
      filters?: {};
    } = {};
    const filters = this.getDefaultFilter(matchedDeeplinkConfig.params);
    const queryParamFilters = {};
    const urlAttributeList = [];
    request.query = url.searchParams.get(matchedDeeplinkConfig.params.key) || '';
    if (url.searchParams.has('se_mediums')) {
      url.searchParams.set('medium', url.searchParams.get('se_mediums'));
    }
    if (url.searchParams.has('se_boards')) {
      url.searchParams.set('board', url.searchParams.get('se_boards'));
    }
    if (url.searchParams.has('se_gradeLevels')) {
      url.searchParams.set('gradeLevel', url.searchParams.get('se_gradeLevels'));
    }
    if (url.searchParams.has('se_subjects')) {
      url.searchParams.set('subject', url.searchParams.get('se_subjects'));
    }
    url.searchParams.forEach((value, key) => {
      urlAttributeList.push(key);
    });

    attributeList = attributeList.filter((attribute) =>  urlAttributeList.indexOf(attribute.code) >= 0
          || urlAttributeList.indexOf(attribute.proxyCode) >= 0);
    attributeList.forEach((attribute) => {
      let values ;
      if (attribute.type === 'Array') {
         values = url.searchParams.getAll(attribute.proxyCode ? attribute.proxyCode : attribute.code);
      } else if (attribute.type === 'String') {
         values = url.searchParams.get(attribute.proxyCode ? attribute.proxyCode : attribute.code);
      }

      if (values && values.length) {
        if (attribute.filter === 'custom') {
          queryParamFilters[attribute.code] =
                  this.getCustomFilterValues(matchedDeeplinkConfig.params, values, attribute);
        } else {
          queryParamFilters[attribute.code] = values;
        }
      }
    });
    request.filters = { ...filters, ...queryParamFilters };
    return request;
  }
  private getDefaultFilter(deeplinkParams) {
    if (!deeplinkParams || !deeplinkParams.data ||  !deeplinkParams.data.length) {
      return {};
    }
    const defaultFilter = deeplinkParams.data.filter((param) => param.type === 'default');
    return defaultFilter.reduce((acc, item) => {
      acc[item.code] = item.values;
      return acc;
    }, {});
  }

  private getCustomFilterValues(deeplinkParams, values, attribute) {
    if (!deeplinkParams || !deeplinkParams.data || !deeplinkParams.data.length) {
      return [];
    }
    const customFilterData = deeplinkParams.data.find((param) => param.type === 'custom' && param.code === attribute.code);
    let customFilterOptions = [];
    if (customFilterData && customFilterData.values) {
      values.forEach((v) => {
          const customFilterValues = customFilterData.values.find(m => m.name === v);
          customFilterOptions = customFilterOptions.concat(customFilterValues ? customFilterValues.options : []);
      });
    }
    return customFilterOptions;
    }
      private getCorrelationList(payloadUrl, corRelation?: Array<CorrelationData>) {
    if (!corRelation) {
      corRelation = [];
    }
    if (payloadUrl) {
      corRelation.push({
        id: ContentUtil.extractBaseUrl(payloadUrl),
        type: CorReleationDataType.SOURCE
      });
    }
    return corRelation;
  }
    private setTabsRoot() {
      if (this.enableRootNavigation) {
        try {
        //  this.location.replaceState(this.router.serializeUrl(this.router.createUrlTree([RouterLinks.TABS])));
        } catch (e) {
          console.log(e);
        }
        this.enableRootNavigation = false;
      }
    }
    private getRouterPath(content) {
      let route;
      if (content.primaryCategory === CsPrimaryCategory.COURSE.toLowerCase()) {
        route = RouterLinks.ENROLLED_COURSE_DETAILS;
      } else if (content.mimeType === MimeType.COLLECTION) {
        route = RouterLinks.COLLECTION_DETAIL_ETB;
      } else {
        route = RouterLinks.CONTENT_DETAILS;
      }
      return route;
    }
}