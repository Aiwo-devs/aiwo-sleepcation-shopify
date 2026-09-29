if (!window.Eurus.loadedScript.has('video-looping.js')) {
  window.Eurus.loadedScript.add('video-looping.js');

  requestAnimationFrame(() => {
    document.addEventListener('alpine:init', () => {
      Alpine.data('xVideoLooping', (spacing, autoplay, showPagination, cardProductPosition, sectionId, swipeOnMobile) => ({
        activeIndex: 0,
        slideList: [],
        originalHeight: 0,
        originalCountItem: 0,
        startSwipePosition: 0,
        isSwiping: 0,
        init() {
          if (window.innerWidth > 767) {
            this.initSlider()
          } else {
            if (swipeOnMobile) {
              this.initSlider()
            }
          }
        },
        initSlider() {
          const container = document.querySelector(`.slider-${sectionId}`);
          let originalItems = Array.from(document.querySelectorAll(`.slider-${sectionId} .item`));
          let cardProductBottomHeight = 0;
          if (cardProductPosition != 'on'){
            const cardProductBottom = originalItems[this.activeIndex].querySelector('.card-product-videolooping');
            if(cardProductBottom) {
              cardProductBottomHeight = cardProductBottom.offsetHeight
            }
          }         

          this.originalCountItem = originalItems.length;
          this.originalHeight = originalItems[this.activeIndex].offsetHeight + cardProductBottomHeight;
          container.style.height = `${this.originalHeight}px`;

          if (originalItems.length == 1) {
            originalItems[this.activeIndex].style.height=`${this.originalHeight}px`;
            this.renderPagination();
          }
          if (originalItems.length > 1) {
            while (originalItems.length < 7) {
              originalItems = originalItems.concat(
                originalItems.map(item => {
                  const clone = item.cloneNode(true);
                  clone.setAttribute('is-clone', true)
                  return clone
                })
              );
            }
            const frag = document.createDocumentFragment();
            originalItems.forEach(item => frag.appendChild(item));

            container.innerHTML = '';
            container.appendChild(frag); 
            
            this.slideList= Array.from(document.querySelectorAll(`.slider-${sectionId} .item`));  
            this.slideList = this.slideList.map((item, index)=>{
              item.setAttribute('slide-index', index);
              return item
            });
            if (!('requestIdleCallback' in window)) {
              setTimeout(() => {
                this.render()
              }, 100);
            } else {
              requestIdleCallback(() => this.render());
            }
          }
        },
        sanitizeClonedItem(item, cloneIndex) {
          if (item.getAttribute('is-clone')){
            const allElements = item.querySelectorAll('[id], [for], [form]');
            allElements.forEach(el => {
              if (el.hasAttribute('id')) {
                const newId = `${el.getAttribute('id')}-clone-${cloneIndex}`;
                el.setAttribute('id', newId);
              }
              if (el.hasAttribute('for')) {
                const newFor = `${el.getAttribute('for')}-clone-${cloneIndex}`;
                el.setAttribute('for', newFor);
              }
              if (el.hasAttribute('form')) {
                const newForm = `${el.getAttribute('form')}-clone-${cloneIndex}`;
                el.setAttribute('form', newForm);
              }
            });
          }
          
        },
        getIndex(i) {
          return (i + this.slideList.length) % this.slideList.length;
        },
        pauseVideo() {
          if (autoplay){
            if (window.innerWidth > 767) {
              const activeItem = this.slideList[this.getIndex(this.activeIndex)];
              let activeVideo;
              let activeExternal;
              if (window.innerWidth > 767){
                activeVideo = activeItem.querySelector('video');
                activeExternal= activeItem.querySelector('.yt-vimec-video');
              } else {
                activeVideo = activeItem.querySelector('.mobile-video-container video');
                activeExternal= activeItem.querySelector('.mobile-video-container .yt-vimec-video');
              }
              
              const activeProgressDot = document.querySelector(`#pagination-${sectionId} .pagination-dot.active .progress`);
              if (activeProgressDot) {
                activeProgressDot.style.animationPlayState = 'paused';
              }
              if (activeVideo) {
                activeVideo.pause();
              }
              if (activeExternal) {
                Alpine.store('xVideo').pause(activeExternal)
              }   
            } else {
              if (swipeOnMobile) {
                const activeItem = this.slideList[this.getIndex(this.activeIndex)];
                let activeVideo;
                let activeExternal;
                if (window.innerWidth > 767){
                  activeVideo = activeItem.querySelector('video');
                  activeExternal= activeItem.querySelector('.yt-vimec-video');
                } else {
                  activeVideo = activeItem.querySelector('.mobile-video-container video');
                  activeExternal= activeItem.querySelector('.mobile-video-container .yt-vimec-video');
                }
                
                const activeProgressDot = document.querySelector(`#pagination-${sectionId} .pagination-dot.active .progress`);
                if (activeProgressDot) {
                  activeProgressDot.style.animationPlayState = 'paused';
                }
                if (activeVideo) {
                  activeVideo.pause();
                }
                if (activeExternal) {
                  Alpine.store('xVideo').pause(activeExternal)
                }   
              }
            }  
          }
        },
        continueVideo() {
          if (autoplay){
            if (window.innerWidth > 767) {
              const activeItem = this.slideList[this.getIndex(this.activeIndex)];
              let activeVideo;
              let activeExternal;
              if (window.innerWidth > 767){
                activeVideo = activeItem.querySelector('video');
                activeExternal= activeItem.querySelector('.yt-vimec-video');
              } else {
                activeVideo = activeItem.querySelector('.mobile-video-container video');
                activeExternal= activeItem.querySelector('.mobile-video-container .yt-vimec-video');
              }
              const activeProgressDot = document.querySelector(`#pagination-${sectionId} .pagination-dot.active .progress`);
              if (activeVideo) {
                activeVideo.play();
              }
              if (activeExternal) {
                Alpine.store('xVideo').play(activeExternal)
              }          
              if (activeProgressDot) {
                activeProgressDot.style.animationPlayState = 'running';
              }
            } else {
              if (swipeOnMobile) {
                const activeItem = this.slideList[this.getIndex(this.activeIndex)];
                let activeVideo;
                let activeExternal;
                if (window.innerWidth > 767){
                  activeVideo = activeItem.querySelector('video');
                  activeExternal= activeItem.querySelector('.yt-vimec-video');
                } else {
                  activeVideo = activeItem.querySelector('.mobile-video-container video');
                  activeExternal= activeItem.querySelector('.mobile-video-container .yt-vimec-video');
                }
                const activeProgressDot = document.querySelector(`#pagination-${sectionId} .pagination-dot.active .progress`);
                if (activeVideo) {
                  activeVideo.play();
                }
                if (activeExternal) {
                  Alpine.store('xVideo').play(activeExternal)
                }          
                if (activeProgressDot) {
                  activeProgressDot.style.animationPlayState = 'running';
                }
              }
            }
          }
        },
        playActiveVideo() {
          const activeItem = this.slideList[this.getIndex(this.activeIndex)];
          let activeVideo;
          let activeExternal;
          if (window.innerWidth > 767){
            activeVideo = activeItem.querySelector('video');
            activeExternal= activeItem.querySelector('.yt-vimec-video');
          } else {
            activeVideo = activeItem.querySelector('.mobile-video-container video');
            activeExternal= activeItem.querySelector('.mobile-video-container .yt-vimec-video');
          }

          this.slideList.forEach(item => {
            const video = item.querySelector('video');
            const externalVideo = item.querySelector('.iframe-video');
            const externalContainer = item.querySelector('.yt-vimec-video');
            if (video) {
              video.pause();
              video.currentTime = 0;
            } else 
            if (externalVideo && externalContainer) {
              Alpine.store('xVideo').pause(externalContainer)
              externalVideo.contentWindow.postMessage(JSON.stringify({
                method: 'pause'
              }), '*');
              externalVideo.contentWindow.postMessage(JSON.stringify({
                method: 'setCurrentTime',
                value: 0
              }), '*');
            }

            const videoMobile = item.querySelector('.mobile-video-container video');
            const externalVideoMobile = item.querySelector('.mobile-video-container .iframe-video');
            const externalContainerMobile = item.querySelector('.mobile-video-container .yt-vimec-video');
            if (videoMobile) {
              videoMobile.pause();
              videoMobile.currentTime = 0;
            } else 
            if (externalVideoMobile && externalContainerMobile) {
              Alpine.store('xVideo').pause(externalContainerMobile)
              externalVideoMobile.contentWindow.postMessage(JSON.stringify({
                method: 'pause'
              }), '*');
              externalVideoMobile.contentWindow.postMessage(JSON.stringify({
                method: 'setCurrentTime',
                value: 0
              }), '*');
            }
          });                
        
          document.querySelectorAll(`#pagination-${sectionId} .pagination-dot .progress`).forEach(progress => {
            progress.style.animation = 'none';
            progress.style.width = '0%';
          });

          const animateProgress = (duration) => {
            if (showPagination) {
              const activeDot = document.querySelector(`#pagination-${sectionId} .pagination-dot.active`);
              if (!activeDot) return;

              const progressBar = activeDot.querySelector('.progress');
              if (!progressBar) return;

              progressBar.style.animation = 'none';

              requestAnimationFrame (()=>{
                progressBar.style.animation = `progressAnim ${duration}s linear forwards`;
              });
            }
          };

          if (activeExternal) {
            const videoType = activeExternal.getAttribute("video-type");
            const videoId = activeExternal.getAttribute("video-id");
            const videoAlt = activeExternal.getAttribute("video-alt");

            Alpine.store('xVideo').externalLoad(activeExternal, videoType, videoId, false, videoAlt, 0);
            
            if (!this._externalListener) {
              this._externalListener = {};
            }

            if (this._externalListener[sectionId]) {
              window.removeEventListener('message', this._externalListener[sectionId]);
            }
            let progressStarted = false;
            this._externalListener[sectionId] = (event) => {
              const activeIframe = activeExternal.querySelector('iframe');
              if (event.source !== activeIframe.contentWindow) return;
              if (event.origin === 'https://www.youtube.com') {
                try {
                  const data = JSON.parse(event.data);
                  if (data.info.duration && data.info.playerState == 1 && !progressStarted && showPagination) {
                    progressStarted = true;
                    animateProgress(data.info.duration);
                  }
                  if (data.event === 'onStateChange' && data.info === 0) {
                    this.activeIndex = this.getIndex(this.activeIndex + 1);
                    this.render();
                  }
                } catch (e) {}
              } else if (event.origin === 'https://player.vimeo.com') {
                try {
                  const data = JSON.parse(event.data);
                  if (data.event === 'play' && showPagination) {               
                    animateProgress(data.data.duration)          
                  }   
                  if (data.event === 'finish') {
                    this.activeIndex = this.getIndex(this.activeIndex + 1);
                    this.render();
                  }                 
                } catch (e) {
                }
              } else {
                return
              };
              this.slideList.forEach(item => {
                const externalVideo = item.querySelector('.iframe-video');
                const externalContainer = item.querySelector('.yt-vimec-video');
                if (item != activeItem) {
                  if (externalVideo && externalContainer) {
                    Alpine.store('xVideo').pause(externalContainer)
                    externalVideo.contentWindow.postMessage(JSON.stringify({
                      method: 'pause'
                    }), '*');
                    externalVideo.contentWindow.postMessage(JSON.stringify({
                      method: 'setCurrentTime',
                      value: 0
                    }), '*');
                  }
                }

                const externalVideoMobile = item.querySelector('.mobile-video-container .iframe-video');
                const externalContainerMobile = item.querySelector('.mobile-video-container .yt-vimec-video');
                if (item != activeItem) {
                  if (externalVideoMobile && externalContainerMobile) {
                    Alpine.store('xVideo').pause(externalContainerMobile)
                    externalVideoMobile.contentWindow.postMessage(JSON.stringify({
                      method: 'pause'
                    }), '*');
                    externalVideoMobile.contentWindow.postMessage(JSON.stringify({
                      method: 'setCurrentTime',
                      value: 0
                    }), '*');
                  }
                }
              });
            };

            window.addEventListener('message', this._externalListener[sectionId]);
          }
          
          if (activeVideo) {
            if (showPagination) {
              const activeProgressDot = document.querySelector(`#pagination-${sectionId} .pagination-dot.active .progress`);
              let progressAnimated = false;
              let lastTime = 0;
            
              const pauseProgress = () => {
                if (activeProgressDot) activeProgressDot.style.animationPlayState = 'paused';
              };
            
              const resumeProgress = () => {
                if (activeProgressDot) activeProgressDot.style.animationPlayState = 'running';
              };
            
              activeVideo.addEventListener("playing", () => {
                if (!progressAnimated && activeVideo.readyState > 2) {
                  animateProgress(activeVideo.duration);
                  progressAnimated = true;
                }
              });
            
              const monitorPlayback = () => {
                if (!activeVideo) return;
            
                const isActuallyPlaying =
                  !activeVideo.paused &&
                  activeVideo.readyState > 2 &&
                  activeVideo.currentTime !== lastTime;
            
                if (isActuallyPlaying) {
                  resumeProgress();
                } else {
                  pauseProgress();
                }
            
                lastTime = activeVideo.currentTime;
                requestAnimationFrame(monitorPlayback);
              };
            
              monitorPlayback();
            }

            requestAnimationFrame(() => {
              activeVideo.play().catch();
            })

            activeVideo.onended = () => {
              this.activeIndex = this.getIndex(this.activeIndex + 1);
              this.render();
            };
          }
        },
        renderPagination() {
          if (showPagination){
            const paginationContainer = document.getElementById(`pagination-${sectionId}`);
            paginationContainer.innerHTML = '';
            for (let i = 0; i < this.originalCountItem; i++) {
              const dot = document.createElement('div');
              dot.className = 'pagination-dot';
              if (i === this.activeIndex % this.originalCountItem) {         
                const activeItem = this.slideList[this.getIndex(this.activeIndex)];
                let activeVideo;
                let activeExternal;
                if (window.innerWidth > 767){
                  activeVideo = activeItem.querySelector('video');
                  activeExternal= activeItem.querySelector('.yt-vimec-video');
                } else {
                  activeVideo = activeItem.querySelector('.mobile-video-container video');
                  activeExternal= activeItem.querySelector('.mobile-video-container .yt-vimec-video');
                }        
                if (activeVideo && autoplay || activeExternal && autoplay){
                  dot.classList.add('autoplay');
                }
                dot.classList.add('active');
              }
              const progress = document.createElement('div');
              progress.className = 'progress';
              dot.appendChild(progress);
          
              dot.addEventListener('click', () => {
                this.activeIndex = i;
                this.render();  
              });
              paginationContainer.appendChild(dot);
            }
          }
        },
        render() {
          let center = Math.floor(7 / 2);
        
          requestAnimationFrame(() => {
            for (let i = 0; i < this.slideList.length; i++) {
              this.slideList[i].style.opacity = '0';
              this.slideList[i].style.zIndex = '0';
              this.slideList[i].style.transform = 'translateX(0)';
              this.slideList[i].style.margin = '0';
              this.slideList[i].style.pointerEvents = 'none';
              this.slideList[i].style.transition = 'all 0.4s ease';
            }
          
            for (let i = -center; i <= center; i++) {
              let idx = this.getIndex(this.activeIndex + i);
              const item = this.slideList[idx];
              const absPos = Math.abs(i);
              const height = this.originalHeight - absPos * 70;
              const opacity = absPos > 2 ? 0 : 1;
              const shift = i * 100;
              const marginLeft = i * spacing;
          
              item.style.zIndex = 10 - absPos;
              item.style.opacity = opacity;
              item.style.filter = 'grayscale(1)'
              item.style.transform = `translateX(${shift}%)`;
              item.style.height = `${height}px`;
              item.style.marginTop = `${(this.originalHeight - height) / 2}px`;
              item.style.marginLeft = `${marginLeft}px`;
            }
            this.slideList[this.activeIndex].style.pointerEvents = 'auto';
            this.slideList[this.activeIndex].style.filter = 'grayscale(0)'
          })
          this.renderPagination();
          if (autoplay){
            this.playActiveVideo();
            if (window.innerWidth > 767) {
              document.addEventListener('visibilitychange', () => {
                if (!document.hidden) {
                  const slideInCard = this.slideList[this.activeIndex].querySelector('.slide-animation');
                  if (slideInCard) {
                    if (slideInCard.classList.contains('translate-y-0') == false){
                      this.playActiveVideo();
                    }      
                  } else {
                    this.playActiveVideo();
                  }
                }
              }); 
            }           
          }
        },
        nextSlide() {
          if (this.originalCountItem > 1) {
            this.activeIndex = this.getIndex(this.activeIndex + 1);
            this.render();
          }
        },
        prevSlide() {
          if (this.originalCountItem > 1) {
            this.activeIndex = this.getIndex(this.activeIndex - 1);
            this.render();
          }
        },
        onMouseDown(e) {
          this.startSwipePosition = e.clientX;
          this.isSwiping = true
        },
        onMouseMove(e) {
          if (!this.isSwiping) return;
          const diffX = e.clientX - this.startSwipePosition;
          if (Math.abs(diffX) > 50) {
            this.isSwiping = false;
            if (diffX < 0) {
              this.nextSlide()
            } else {
              this.prevSlide()
            }
          }
        },
        onMouseUp() {
          this.isSwiping = false
        },
        onMouseLeave() {
          this.isSwiping = false
        },
        onTouchStart(e) {
          this.startSwipePosition = e.touches[0].clientX;
          this.isSwiping = true;
        },
        onTouchMove(e) {
          if (!this.isSwiping) return;
          const diffX = e.touches[0].clientX - this.startSwipePosition;
          if (Math.abs(diffX) > 50) {
            this.isSwiping = false;
            if (diffX < 0) {
              this.nextSlide()
            } else {
              this.prevSlide()
            }
          }
        },
        onTouchEnd() {
          this.isSwiping = false
        },
        onTouchCancel() {
          this.isSwiping = false
        }
      }))
    })
  })
}