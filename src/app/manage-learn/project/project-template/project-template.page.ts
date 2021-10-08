import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  Inject,
  NgZone,
} from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import {
  PopoverController,
  AlertController,
  Platform,
  ModalController,
} from "@ionic/angular";
import * as _ from "underscore";
import { TranslateService } from "@ngx-translate/core";
import { statusType, statuses } from "../../core/constants/statuses.constant";
import { UtilsService } from "@app/app/manage-learn/core/services/utils.service";
import * as moment from "moment";
import {AppHeaderService, CommonUtilService } from "@app/services";
import { menuConstants } from "../../core/constants/menuConstants";
import { PopoverComponent } from "../../shared/components/popover/popover.component";
import { Subscription } from "rxjs";
import { DbService } from "../../core/services/db.service";
import { LoaderService, ToastService, NetworkService } from "../../core";
import { SyncService } from "../../core/services/sync.service";
import { UnnatiDataService } from "../../core/services/unnati-data.service";
import { urlConstants } from "../../core/constants/urlConstants";
import { RouterLinks } from "@app/app/app.constant";
import { CreateTaskFormComponent } from "../../shared";
import { SharingFeatureService } from "../../core/services/sharing-feature.service";
import { Location } from "@angular/common";

@Component({
  selector: "app-project-template",
  templateUrl: "./project-template.page.html",
  styleUrls: ["./project-template.page.scss"],
})
export class ProjectTemplatePage {
  showDetails: boolean = true;
  statuses = statuses;
  project: any;
  projectId;
  projectType = "";
  categories = [];
  isTargeted;
  taskCount: number = 0;
  filters: any = {};
  schedules = this.utils.getSchedules();
  sortedTasks;
  programId;
  solutionId;
  private backButtonFunc: Subscription;

  isNotSynced: boolean;
  locationChangeTriggered: boolean = false;
  allStrings;
  viewOnlyMode: boolean = false;
  templateId;
  templateDetailsPayload;
  importProjectClicked: boolean = false;
  fromImportProject: boolean = false;
  shareTaskId;
  networkFlag: boolean;
  id;
  private _networkSubscription: Subscription;
  headerConfig = {
    showHeader: true,
    showBurgerMenu: false,
    pageTitle: '',
    actionButtons: []
  };
  closeAlert;
  constructor(
    public params: ActivatedRoute,
    public popoverController: PopoverController,
    private loader: LoaderService,
    private router: Router,
    private utils: UtilsService,
    private alert: AlertController,
    private share: SharingFeatureService,
    private syncServ: SyncService,
    private toast: ToastService,
    private translate: TranslateService,
    private modal: ModalController,
    private unnatiService: UnnatiDataService,
    private platform: Platform,
    private ref: ChangeDetectorRef,
    private alertController: AlertController,
    private network: NetworkService,
    private location: Location,
    private zone: NgZone,
    private commonUtilService: CommonUtilService,
    private headerService: AppHeaderService,
  ) {
    params.params.subscribe(parameters =>{
      this.id = parameters.id;
    })
    params.queryParams.subscribe((parameters) => {
      this.isTargeted = parameters.isTargeted
      // console.log("queryParams");
      // console.log(parameters);
      // this.solutionId = parameters.solutionId;
      // this.programId = parameters.programId;
      // this.projectType = parameters.type ? parameters.type : "";
      // this.templateDetailsPayload = this.router.getCurrentNavigation().extras.state;
      // this.fromImportProject = (parameters.fromImportPage && parameters.fromImportPage == 'true') ? true : false;
    });
    this.translate
      .get([
        "FRMELEMNTS_MSG_SOMETHING_WENT_WRONG",
        "FRMELEMNTS_MSG_NO_ENTITY_MAPPED",
        "FRMELEMNTS_MSG_CANNOT_GET_PROJECT_DETAILS",
        "FRMELEMNTS_LBL_IMPORT_PROJECT_MESSAGE",
        "YES",
        "NO",
        "FRMELEMNTS_LBL_IMPORT_PROJECT_SUCCESS",
      ])
      .subscribe((texts) => {
        this.allStrings = texts;
      });
    this.getProjectApi();
  }

  ngOnInit() {
  }

  ionViewWillEnter() {
    let data;
    this.translate.get(["FRMELEMNTS_LBL_PROJECT_VIEW"]).subscribe((text) => {
      data = text;
    });
    this.headerConfig = this.headerService.getDefaultPageConfig();
    this.headerConfig.actionButtons = [];
    this.headerConfig.showHeader = false;
    this.headerConfig.showBurgerMenu = false;
    this.headerConfig.pageTitle = data["FRMELEMNTS_LBL_PROJECT_VIEW"];
    this.headerService.updatePageConfig(this.headerConfig);
    // this.handleBackButton();
  }

  getProjectApi() {
    this.project = {
      _id: "5ffbd53f5fc92a7dbc972906",
      description: "",
      concepts: [""],
      keywords: ["Community, Parent Mela"],
      isDeleted: false,
      recommendedFor: [],
      tasks: [
        {
          _id: "5fd2447b1233354b094f15d5",
          createdBy: "140558b9-7df4-4993-be3c-31eb8b9ca368",
          updatedBy: "140558b9-7df4-4993-be3c-31eb8b9ca368",
          isDeleted: false,
          taskSequence: [],
          children: [
            {
              _id: "5fd2447b1233354b094f15db",
              createdBy: "140558b9-7df4-4993-be3c-31eb8b9ca368",
              updatedBy: "140558b9-7df4-4993-be3c-31eb8b9ca368",
              isDeleted: false,
              taskSequence: [],
              children: [],
              visibleIf: [
                {
                  operator: "===",
                  _id: "5fd2447b1233354b094f15d5",
                  value: "started",
                },
              ],
              hasSubTasks: false,
              learningResources: [],
              deleted: false,
              type: "simple",
              name: "Look for videos and case studies which capture the parent mela or parent meeting conducted in different schools. Focus on the ideas being used and themes being selected.",
              externalId: "IMP-3147aa-TASK7",
              description: "",
              updatedAt: "2020-12-10T15:53:31.478Z",
              createdAt: "2020-12-10T15:53:31.476Z",
              parentId: "5fd2447b1233354b094f15d5",
              isDeletable: true,
            },
          ],
          visibleIf: [],
          hasSubTasks: true,
          learningResources: [],
          deleted: false,
          type: "simple",
          name: "Look for samples of parent mela/ excitement building parent meeting from different schools",
          externalId: "IMP-3147aa-TASK1",
          description: "",
          updatedAt: "2020-12-10T15:53:31.477Z",
          createdAt: "2020-12-10T15:53:31.460Z",
          isDeletable: true,
        },
        {
          _id: "5fd2447b1233354b094f15d6",
          createdBy: "140558b9-7df4-4993-be3c-31eb8b9ca368",
          updatedBy: "140558b9-7df4-4993-be3c-31eb8b9ca368",
          isDeleted: false,
          taskSequence: [],
          children: [
            {
              _id: "5fd2447b1233354b094f15dc",
              createdBy: "140558b9-7df4-4993-be3c-31eb8b9ca368",
              updatedBy: "140558b9-7df4-4993-be3c-31eb8b9ca368",
              isDeleted: false,
              taskSequence: [],
              children: [],
              visibleIf: [
                {
                  operator: "===",
                  _id: "5fd2447b1233354b094f15d6",
                  value: "started",
                },
              ],
              hasSubTasks: false,
              learningResources: [],
              deleted: false,
              type: "simple",
              name: "-Meeting with teachers to discuss the importance and role of parent mela in improving community engagement in the school.",
              externalId: "IMP-3147aa-TASK8",
              description: "",
              updatedAt: "2020-12-10T15:53:31.483Z",
              createdAt: "2020-12-10T15:53:31.481Z",
              parentId: "5fd2447b1233354b094f15d6",
              isDeletable: true,
            },
            {
              _id: "5fd2447b1233354b094f15e1",
              createdBy: "140558b9-7df4-4993-be3c-31eb8b9ca368",
              updatedBy: "140558b9-7df4-4993-be3c-31eb8b9ca368",
              isDeleted: false,
              taskSequence: [],
              children: [],
              visibleIf: [
                {
                  operator: "===",
                  _id: "5fd2447b1233354b094f15d6",
                  value: "started",
                },
              ],
              hasSubTasks: false,
              learningResources: [],
              deleted: false,
              type: "simple",
              name: "-Discuss stories from other schools.",
              externalId: "IMP-3147aa-TASK13",
              description: "",
              updatedAt: "2020-12-10T15:53:31.511Z",
              createdAt: "2020-12-10T15:53:31.509Z",
              parentId: "5fd2447b1233354b094f15d6",
              isDeletable: true,
            },
            {
              _id: "5fd2447b1233354b094f15e2",
              createdBy: "140558b9-7df4-4993-be3c-31eb8b9ca368",
              updatedBy: "140558b9-7df4-4993-be3c-31eb8b9ca368",
              isDeleted: false,
              taskSequence: [],
              children: [],
              visibleIf: [
                {
                  operator: "===",
                  _id: "5fd2447b1233354b094f15d6",
                  value: "started",
                },
              ],
              hasSubTasks: false,
              learningResources: [],
              deleted: false,
              type: "simple",
              name: "- Form a committee among teachers to plan and facilitate the mela along with the school leader.",
              externalId: "IMP-3147aa-TASK14",
              description: "",
              updatedAt: "2020-12-10T15:53:31.524Z",
              createdAt: "2020-12-10T15:53:31.521Z",
              parentId: "5fd2447b1233354b094f15d6",
              isDeletable: true,
            },
          ],
          visibleIf: [],
          hasSubTasks: true,
          learningResources: [],
          deleted: false,
          type: "simple",
          name: "Form a parent mela committee among the teachers",
          externalId: "IMP-3147aa-TASK2",
          description: "",
          updatedAt: "2020-12-10T15:53:31.522Z",
          createdAt: "2020-12-10T15:53:31.463Z",
          isDeletable: true,
        },
        {
          _id: "5fd2447b1233354b094f15d7",
          createdBy: "140558b9-7df4-4993-be3c-31eb8b9ca368",
          updatedBy: "140558b9-7df4-4993-be3c-31eb8b9ca368",
          isDeleted: false,
          taskSequence: [],
          children: [
            {
              _id: "5fd2447b1233354b094f15dd",
              createdBy: "140558b9-7df4-4993-be3c-31eb8b9ca368",
              updatedBy: "140558b9-7df4-4993-be3c-31eb8b9ca368",
              isDeleted: false,
              taskSequence: [],
              children: [],
              visibleIf: [
                {
                  operator: "===",
                  _id: "5fd2447b1233354b094f15d7",
                  value: "started",
                },
              ],
              hasSubTasks: false,
              learningResources: [],
              deleted: false,
              type: "simple",
              name: "Finalize the themes and activities for the mela. This could be taken borrowed from other schools or decided by the teachers through brainstorming. \nFinalize the dates for the same",
              externalId: "IMP-3147aa-TASK9",
              description: "",
              updatedAt: "2020-12-10T15:53:31.489Z",
              createdAt: "2020-12-10T15:53:31.487Z",
              parentId: "5fd2447b1233354b094f15d7",
              isDeletable: true,
            },
          ],
          visibleIf: [],
          hasSubTasks: true,
          learningResources: [],
          deleted: false,
          type: "simple",
          name: "Planning for the mela",
          externalId: "IMP-3147aa-TASK3",
          description: "",
          updatedAt: "2020-12-10T15:53:31.488Z",
          createdAt: "2020-12-10T15:53:31.465Z",
          isDeletable: true,
        },
      ],
      learningResources: [
        {
          name: "Examprep_10EM_ps_cha1_Q3",
          id: "do_31268582767737241615189",
          app: "diksha",
          link: "https://staging.sunbirded.org/resources/play/content/do_31268582767737241615189",
        },
        {
          name: "Examprep_10tm_ps_cha 11-Q2",
          id: "do_31269107959395942417491",
          app: "diksha",
          link: "https://staging.sunbirded.org/resources/play/content/do_31269107959395942417491",
        },
        {
          name: "Examprep_10tm_ps_cha 11-Q3",
          id: "do_31269108472948326417493",
          app: "diksha",
          link: "https://staging.sunbirded.org/resources/play/content/do_31269108472948326417493",
        },
      ],
      isReusable: false,
      taskSequence: [],
      deleted: false,
      categories: [
        {
          _id: "5fcfa9a2457d6055e33843f2",
          externalId: "community",
          name: "Community",
        },
      ],
      title: "Come See Our School!- Parent Mela",
      externalId: "MAHARASTHA IMPROVEMENT PROJECT TEMPLATE",
      entityType: "",
      taskCreationForm: "",
      status: "published",
      solutionId: "5ff9dc1b9259097d48017bbe",
      solutionExternalId: "MAHARASTHA-IMPROVEMENT-PROJECT",
      programInformation: {
        programId: "5ff840ce383ae437eb02b96c",
        programName: "MAHARASTHA AUTO TARGETING program",
      },
      rationale: "",
      primaryAudience: ["Community"],
      goal: "Organizing the Parent Mela in the school in order to make better community reach",
      duration: "At the end of every quarter",
      successIndicators: "",
      risks: "",
      approaches: "",
      projectId: "",
    };
    this.categories=[];
    this.project.categories.forEach((category: any) => {
      category.label ? this.categories.push(category.label) : this.categories.push(category.name);
    });
   this.sortTasks();
  }

  async sortTasks() {
    let projectData:any= await this.utils.getSortTasks(this.project);
    this.project = projectData.project;
    this.sortedTasks=projectData.sortedTasks;
    this.taskCount=projectData.taskCount;
  }

  toggle() {
    this.showDetails = !this.showDetails;
  }

  async closeTemplate() {
    this.closeAlert= await this.alertController.create({
      header: "Close Page",
      message: `Are you sure you want to close this page?`,
      buttons: [
        {
          text: "Go Back",
          role: "ok",
          handler: blah => {
            this.closeAlert.dismiss();
            this.router.navigate([`/${RouterLinks.PROJECT}`],{queryParams:{
              selectedFilter:this.isTargeted ? 'assignedToMe' : 'discoveredByMe'
            }});
          }
        },
        {
          text: "Close Page",
          role: "cancel",
          handler: blah => {
            this.router.navigate([
              `/${RouterLinks.HOME}`
            ]);
          }
        }
      ],
      backdropDismiss: false
    })
    await this.closeAlert.present();
  }

}
