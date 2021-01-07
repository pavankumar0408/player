import { Component, OnInit, Input, ViewChild, Output, EventEmitter, AfterViewInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { CarouselComponent } from 'ngx-bootstrap/carousel';
import { QumlLibraryService } from '../quml-library.service';
import { QumlPlayerConfig } from '../quml-library-interface';
import { UserService } from '../user-service';
import { eventName, TelemetryType, pageId } from '../telemetry-constants';



@Component({
  selector: 'quml-player',
  templateUrl: './player.component.html',
  styleUrls: ['./player.component.scss']
})
export class PlayerComponent implements OnInit, AfterViewInit {
  @Input() questions: any;
  @Input() QumlPlayerConfig: QumlPlayerConfig;
  @Input() linearNavigation: boolean;
  @Input() duration: any;
  @Output() componentLoaded = new EventEmitter<any>();
  @Output() playerEvent = new EventEmitter<any>();
  @Output() telemetryEvent = new EventEmitter<any>();
  @Output() previousClicked = new EventEmitter<any>();
  @Output() nextClicked = new EventEmitter<any>();
  @Output() questionClicked = new EventEmitter<any>();
  @ViewChild('car') car: CarouselComponent;

  scoreBoard = [];
  endPageReached: boolean;
  slides: any;
  slideInterval: number;
  showIndicator: Boolean;
  noWrapSlides: Boolean;
  optionSelectedObj: any;
  showAlert: Boolean;
  currentOptions: any;
  currentQuestion: any;
  currentSolutions: any;
  showSolution: any;
  active = false;
  alertType: boolean;
  previousOption: any;
  scoreBoardObject = {};
  timeLimit: any;
  showTimer: any;
  showFeedBack: boolean;
  showUserSolution: boolean;
  startPageInstruction: string;
  shuffleQuestions: boolean;
  requiresSubmit: boolean;
  noOfQuestions: number;
  maxScore: number;
  initialTime: number;
  initializeTimer: boolean;
  durationSpent: string;
  userName: string;
  contentName: string;
  currentSlideIndex = 0;
  attemptedQuestions = [];
  loadScoreBoard = false;
  // need to see
  loadingScreen = true;
  private intervalRef: any;
  progressBarClass = [];
  CarouselConfig = {
    NEXT: 1,
    PREV: 2
  };
  sideMenuConfig = {
    showShare: true,
    showDownload: true,
    showReplay: false,
    showExit: true,
  };

  constructor(
    public qumlLibraryService: QumlLibraryService,
    public userService: UserService
  ) {
    this.endPageReached = false;
    this.userService.qumlPlayerEvent.asObservable().subscribe((res) => {
      this.playerEvent.emit(res);
    });
  }

  @HostListener('document:TelemetryEvent', ['$event'])
  onTelemetryEvent(event) {
    this.telemetryEvent.emit(event.detail);
  }

  ngOnInit() {
    this.qumlLibraryService.initializeTelemetry(this.QumlPlayerConfig);
    this.userService.initialize(this.QumlPlayerConfig);
    this.initialTime = new Date().getTime();
    this.slideInterval = 0;
    this.showIndicator = false;
    this.noWrapSlides = true;
    this.questions = this.QumlPlayerConfig.data.children;
    this.timeLimit = this.QumlPlayerConfig.data.timeLimit ?
                     this.QumlPlayerConfig.data.timeLimit :  (this.questions.length * 350000);
    this.showTimer = this.QumlPlayerConfig.data.showTimer;
    this.showFeedBack = this.QumlPlayerConfig.data.showFeedback;
    this.showUserSolution = this.QumlPlayerConfig.data.showSolutions;
    this.startPageInstruction = this.QumlPlayerConfig.data.instructions;
    this.linearNavigation = this.QumlPlayerConfig.data.navigationMode === 'non-linear' ? false : true;
    this.requiresSubmit = this.QumlPlayerConfig.data.requiresSubmit ? this.QumlPlayerConfig.data.requiresSubmit : false; 
    this.noOfQuestions = this.QumlPlayerConfig.data.totalQuestions;
    this.maxScore = this.QumlPlayerConfig.data.maxScore;
    this.userName = this.QumlPlayerConfig.context.userData.firstName + ' ' + this.QumlPlayerConfig.context.userData.lastName;
    this.contentName = this.QumlPlayerConfig.data.name;
    if (this.QumlPlayerConfig.data.shuffle) {
      this.questions = this.QumlPlayerConfig.data.children.sort(() => Math.random() - 0.5);
    }
    this.userService.raiseStartEvent(this.car.getCurrentSlideIndex());
    this.addClassToQuestion();
  }

  ngAfterViewInit() {
    this.userService.raiseHeartBeatEvent(eventName.startPageLoaded, TelemetryType.impression, pageId.startPage);
  }

  nextSlide() {
    this.userService.raiseHeartBeatEvent(eventName.nextClicked, TelemetryType.interact, this.currentSlideIndex);
    if(this.loadScoreBoard) {
      this.endPageReached = true;
    }
    if (this.currentSlideIndex !== this.questions.length) {
      this.currentSlideIndex = this.currentSlideIndex + 1;
    }
    if (this.currentSlideIndex === 1 && (this.currentSlideIndex - 1) === 0) {
      this.initializeTimer = true;
    }
    if (this.car.getCurrentSlideIndex() === this.questions.length) {
      const spentTime = (new Date().getTime() - this.initialTime) / 10000;
      this.durationSpent = spentTime.toFixed(2);
      if (!this.requiresSubmit) {
        this.endPageReached = true;
        this.userService.raiseEndEvent(this.currentSlideIndex, this.attemptedQuestions.length, this.endPageReached);
      } else {
        this.loadScoreBoard = true;
      }
    }
    this.car.move(this.CarouselConfig.NEXT);
    this.active = false;
    this.showAlert = false;
    this.optionSelectedObj = undefined;
    if (!this.attemptedQuestions.includes(this.car.getCurrentSlideIndex())) {
      this.attemptedQuestions.push(this.car.getCurrentSlideIndex());
    }
    if (this.intervalRef) {
      clearInterval(this.intervalRef);
    }
  }

  prevSlide() {
    this.userService.raiseHeartBeatEvent(eventName.prevClicked, TelemetryType.interact, this.car.getCurrentSlideIndex());
    this.showAlert = false;
    if (this.attemptedQuestions.includes(this.car.getCurrentSlideIndex())) {
      const index = this.attemptedQuestions.indexOf(this.car.getCurrentSlideIndex());
      this.attemptedQuestions.splice(index, 1);
    } else if (this.car.getCurrentSlideIndex() === 0) {
      this.attemptedQuestions = [];
    }
    if (this.currentSlideIndex > 0) {
      this.currentSlideIndex = this.currentSlideIndex - 1;
    }
    if (this.car.getCurrentSlideIndex() + 1 === this.questions.length && this.endPageReached) {
      this.endPageReached = false;
    } else if (!this.loadScoreBoard) {
      this.car.move(this.CarouselConfig.PREV);
    } else if (!this.linearNavigation && this.loadScoreBoard) {
      const index = this.questions.length;
      this.car.selectSlide(index);
      this.loadScoreBoard = false;
    }
    if (!this.attemptedQuestions.includes(this.car.getCurrentSlideIndex())) {
      this.attemptedQuestions.push(this.car.getCurrentSlideIndex());
    }
  }

  sideBarEvents(event){
    this.userService.raiseHeartBeatEvent(event, TelemetryType.interact , this.car.getCurrentSlideIndex());
  }


  getOptionSelected(optionSelected) {
    this.userService.raiseHeartBeatEvent(eventName.optionClicked, TelemetryType.interact, pageId.startPage);
    this.optionSelectedObj = optionSelected;
    this.currentSolutions = optionSelected.solutions;
    this.active = true;
  }

  closeAlertBox(event) {
    if (event.type === 'close') {
      this.userService.raiseHeartBeatEvent(eventName.closedFeedBack, TelemetryType.interact, this.car.getCurrentSlideIndex());
    } else if (event.type === 'tryAgain') {
      this.userService.raiseHeartBeatEvent(eventName.tryAgain, TelemetryType.interact, this.car.getCurrentSlideIndex());
    }
    this.showAlert = false;
  }

  viewSolution() {
    this.userService.raiseHeartBeatEvent(eventName.viewSolutionClicked, TelemetryType.interact, this.car.getCurrentSlideIndex());
    this.showSolution = true;
    this.showAlert = false;
    clearTimeout(this.intervalRef);
  }

  exitContent(event) {
    if (event.type === 'EXIT') {
      this.userService.raiseEndEvent(this.currentSlideIndex, this.currentSlideIndex - 1, this.endPageReached);
    }
  }

  closeSolution() {
    this.userService.raiseHeartBeatEvent(eventName.solutionClosed, TelemetryType.interact, this.car.getCurrentSlideIndex());
    this.showSolution = false;
    this.car.selectSlide(this.currentSlideIndex);
  }

  async validateSelectedOption(option) {
    this.scoreBoardObject = {};
    let updated = false;
    if (this.optionSelectedObj !== undefined) {
      const currentIndex = this.car.getCurrentSlideIndex() - 1;
      let keys = Object.keys(this.questions[currentIndex].responseDeclaration);
      let key;
      keys.forEach((ele) => {
        if(ele.includes('response')){
           key = ele;
        }
      })
      const correctOptionValue = this.questions[currentIndex].responseDeclaration[key].correctResponse.value;
      this.currentQuestion = this.questions[currentIndex].body;
      this.currentOptions = this.questions[currentIndex].interactions.response1.options;
      if (Boolean(option.option.value.value == correctOptionValue)) {
          this.scoreBoardObject['index'] = this.car.getCurrentSlideIndex();
          this.scoreBoardObject['status'] = true;
          this.scoreBoardObject['class'] = 'correct';
          this.showAlert = true;
          this.alertType = true;
          this.correctFeedBackTimeOut();
          this.progressBarClass[this.car.getCurrentSlideIndex() - 1].class="correct";
      } else if (!Boolean(option.option.value.value == correctOptionValue)) {
          this.scoreBoardObject['index'] = this.car.getCurrentSlideIndex();
          this.scoreBoardObject['status'] = false;
          this.scoreBoardObject['class'] = 'wrong';
          this.showAlert = true;
          this.alertType = false;
          this.progressBarClass[this.car.getCurrentSlideIndex() - 1].class="wrong";
      }
      this.optionSelectedObj = undefined;
    } else if (this.optionSelectedObj === undefined && !this.active) {
      this.scoreBoardObject['index'] = this.car.getCurrentSlideIndex();
      this.scoreBoardObject['status'] = false;
      this.scoreBoardObject['class'] = 'skipped';
      this.nextSlide();
      this.progressBarClass[this.car.getCurrentSlideIndex() - 1].class="skipped";
    } else if (this.optionSelectedObj === undefined && this.active) {
      this.nextSlide();
    }
    this.scoreBoard.forEach((ele) => {
      if (ele.index === this.scoreBoardObject['index']) {
        ele['status'] = this.scoreBoardObject['status'];
        ele['class'] = this.scoreBoardObject['class'];
        updated = true;
      }
    });
    if (!updated && Object.keys(this.scoreBoardObject).length > 0) {
      this.scoreBoard.push(this.scoreBoardObject);
    }
  }
 
  correctFeedBackTimeOut() {
    this.intervalRef = setTimeout(() => {
      this.showAlert = false;
      if (!this.car.isLast(this.car.getCurrentSlideIndex())) {
        this.car.move(this.CarouselConfig.NEXT);
      } else if (this.car.isLast(this.car.getCurrentSlideIndex())) {
        this.endPageReached = true;
      }
    }, 3000)
  }
  nextSlideClicked(event) {
    if (event.type === 'next') {
      this.validateSelectedOption(this.optionSelectedObj);
    }
  }

  previousSlideClicked(event) {
    if (event = 'previous clicked') {
      this.prevSlide();
    }
  }
  replayContent() {
    this.userService.raiseHeartBeatEvent(eventName.replayClicked, TelemetryType.interact, this.car.getCurrentSlideIndex());
    this.userService.raiseStartEvent(this.car.getCurrentSlideIndex());
    this.endPageReached = false;
    this.loadScoreBoard = false;
    this.currentSlideIndex = 1;
    this.attemptedQuestions = [];
    this.attemptedQuestions.push(1);
    this.car.selectSlide(1);
  }

  inScoreBoardSubmitClicked() {
    this.userService.raiseHeartBeatEvent(eventName.scoreBoardSubmitClicked, TelemetryType.interact, pageId.submitPage);
    this.endPageReached = true;
  }

  goToSlide(index) {
    this.currentSlideIndex = index;
    this.car.selectSlide(index);
  }

  scoreBoardSubmitClicked(event) {
      if (event.type = 'submit-clicked') {
        this.endPageReached = true;
      }
  }

  addClassToQuestion() {
    this.questions.forEach((ele, index) => {
      this.progressBarClass.push({index: (index+1) , class: 'skipped'});
    })
  }

  goToQuestion(event) {
    this.car.selectSlide(event.questionNo);
    this.loadScoreBoard = false;
  }
}