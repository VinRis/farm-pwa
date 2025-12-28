import './Footer.css';

class Footer {
    constructor(config = {}) {
        this.showVersion = config.showVersion !== false;
        this.version = config.version || '2.0.0';
        this.showCopyright = config.showCopyright !== false;
        this.copyrightYear = config.copyrightYear || new Date().getFullYear();
        this.showLinks = config.showLinks !== false;
        this.links = config.links || [
            { text: 'Privacy Policy', href: '#', target: '_blank' },
            { text: 'Terms of Service', href: '#', target: '_blank' },
            { text: 'Help Center', href: '#', target: '_blank' },
            { text: 'Contact Us', href: '#', target: '_blank' }
        ];
        this.showPWAStatus = config.showPWAStatus !== false;
        
        this.init();
    }
    
    init() {
        console.log('Footer initialized');
    }
    
    render() {
        const footer = document.createElement('footer');
        footer.className = 'app-footer';
        footer.setAttribute('role', 'contentinfo');
        
        const isPWA = window.matchMedia('(display-mode: standalone)').matches;
        
        footer.innerHTML = `
            <div class="footer-container">
                <div class="footer-section footer-info">
                    ${this.showCopyright ? `
                        <div class="footer-copyright">
                            © ${this.copyrightYear} Farm Manager Pro. All rights reserved.
                        </div>
                    ` : ''}
                    
                    ${this.showVersion ? `
                        <div class="footer-version">
                            Version ${this.version}
                        </div>
                    ` : ''}
                    
                    ${this.showPWAStatus ? `
                        <div class="footer-pwa-status">
                            <span class="pwa-status ${isPWA ? 'installed' : 'browser'}">
                                ${isPWA ? '📱 Installed as PWA' : '🌐 Browser Mode'}
                            </span>
                        </div>
                    ` : ''}
                </div>
                
                ${this.showLinks ? `
                    <div class="footer-section footer-links">
                        <div class="links-title">Quick Links</div>
                        <div class="links-container">
                            ${this.links.map(link => `
                                <a href="${link.href}" 
                                   class="footer-link" 
                                   target="${link.target || '_self'}"
                                   rel="noopener noreferrer">
                                    ${link.text}
                                </a>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <div class="footer-section footer-actions">
                    <button class="footer-action-btn" id="install-pwa-btn" style="${isPWA ? 'display: none;' : ''}">
                        <span class="action-icon">📱</span>
                        <span class="action-text">Install App</span>
                    </button>
                    
                    <button class="footer-action-btn" id="share-app-btn">
                        <span class="action-icon">📤</span>
                        <span class="action-text">Share</span>
                    </button>
                    
                    <button class="footer-action-btn" id="feedback-btn">
                        <span class="action-icon">💬</span>
                        <span class="action-text">Feedback</span>
                    </button>
                </div>
            </div>
            
            <div class="footer-bottom">
                <div class="footer-message">
                    Made with ❤️ for farmers everywhere
                </div>
                <div class="footer-stats">
                    <span class="stat-item">
                        <span class="stat-icon">📊</span>
                        <span class="stat-text" id="data-count">0 records</span>
                    </span>
                    <span class="stat-item">
                        <span class="stat-icon">💾</span>
                        <span class="stat-text" id="storage-used">0 MB</span>
                    </span>
                </div>
            </div>
        `;
        
        // Add event listeners
        const installBtn = footer.querySelector('#install-pwa-btn');
        if (installBtn) {
            installBtn.addEventListener('click', () => this.handleInstallPWA());
        }
        
        const shareBtn = footer.querySelector('#share-app-btn');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => this.handleShareApp());
        }
        
        const feedbackBtn = footer.querySelector('#feedback-btn');
        if (feedbackBtn) {
            feedbackBtn.addEventListener('click', () => this.handleFeedback());
        }
        
        // Update stats periodically
        this.updateStats();
        setInterval(() => this.updateStats(), 30000);
        
        return footer;
    }
    
    async updateStats() {
        try {
            // Get data count from IndexedDB
            let dataCount = 0;
            if (window.offlineDb) {
                const dairyCount = await offlineDb.count('dairy_cows');
                const poultryCount = await offlineDb.count('poultry_flocks');
                dataCount = dairyCount + poultryCount;
            }
            
            // Get storage usage
            const storageUsed = await this.getStorageUsage();
            
            // Update UI
            const dataCountElement = document.getElementById('data-count');
            const storageUsedElement = document.getElementById('storage-used');
            
            if (dataCountElement) {
                dataCountElement.textContent = `${dataCount} records`;
            }
            
            if (storageUsedElement) {
                storageUsedElement.textContent = `${storageUsed} MB`;
            }
        } catch (error) {
            console.error('Failed to update footer stats:', error);
        }
    }
    
    async getStorageUsage() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            try {
                const estimate = await navigator.storage.estimate();
                const usedMB = Math.round(estimate.usage / (1024 * 1024) * 100) / 100;
                return usedMB;
            } catch (error) {
                console.error('Failed to get storage estimate:', error);
            }
        }
        return '0';
    }
    
    handleInstallPWA() {
        console.log('Install PWA clicked');
        
        // Check if PWA install is available
        if (window.deferredPrompt) {
            window.deferredPrompt.prompt();
            
            window.deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('User accepted the install prompt');
                    // Hide the install button
                    const installBtn = document.querySelector('#install-pwa-btn');
                    if (installBtn) {
                        installBtn.style.display = 'none';
                    }
                } else {
                    console.log('User dismissed the install prompt');
                }
                window.deferredPrompt = null;
            });
        } else {
            // Show instructions for manual install
            this.showInstallInstructions();
        }
    }
    
    showInstallInstructions() {
        const instructions = document.createElement('div');
        instructions.className = 'install-instructions';
        instructions.innerHTML = `
            <div class="instructions-content">
                <h3>Install Farm Manager Pro</h3>
                <p>To install this app:</p>
                <ul>
                    <li><strong>Chrome/Edge:</strong> Click the install icon (📥) in the address bar</li>
                    <li><strong>Safari:</strong> Tap Share → Add to Home Screen</li>
                    <li><strong>Firefox:</strong> Menu → Install</li>
                </ul>
                <button class="btn btn-primary close-instructions">Got it</button>
            </div>
        `;
        
        document.body.appendChild(instructions);
        
        instructions.querySelector('.close-instructions').addEventListener('click', () => {
            document.body.removeChild(instructions);
        });
    }
    
    async handleShareApp() {
        console.log('Share app clicked');
        
        const shareData = {
            title: 'Farm Manager Pro',
            text: 'Manage your dairy and poultry farm with this amazing PWA!',
            url: window.location.href
        };
        
        if (navigator.share) {
            try {
                await navigator.share(shareData);
                console.log('App shared successfully');
            } catch (error) {
                console.error('Error sharing:', error);
            }
        } else {
            // Fallback: copy to clipboard
            try {
                await navigator.clipboard.writeText(shareData.url);
                this.showNotification('Link copied to clipboard!', 'success');
            } catch (error) {
                console.error('Failed to copy:', error);
                // Last resort: show URL
                prompt('Copy this link to share:', shareData.url);
            }
        }
    }
    
    handleFeedback() {
        console.log('Feedback clicked');
        
        const feedbackForm = document.createElement('div');
        feedbackForm.className = 'feedback-form';
        feedbackForm.innerHTML = `
            <div class="feedback-content">
                <h3>Send Feedback</h3>
                <form id="feedback-form">
                    <div class="form-group">
                        <label for="feedback-type">Feedback Type</label>
                        <select id="feedback-type" required>
                            <option value="">Select type</option>
                            <option value="bug">Bug Report</option>
                            <option value="feature">Feature Request</option>
                            <option value="suggestion">Suggestion</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="feedback-message">Message</label>
                        <textarea id="feedback-message" 
                                  placeholder="Tell us what you think..." 
                                  rows="4" 
                                  required></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label for="feedback-email">Email (Optional)</label>
                        <input type="email" 
                               id="feedback-email" 
                               placeholder="Your email for follow-up">
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary cancel-feedback">Cancel</button>
                        <button type="submit" class="btn btn-primary">Send Feedback</button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(feedbackForm);
        
        // Close button
        feedbackForm.querySelector('.cancel-feedback').addEventListener('click', () => {
            document.body.removeChild(feedbackForm);
        });
        
        // Form submission
        feedbackForm.querySelector('#feedback-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = {
                type: feedbackForm.querySelector('#feedback-type').value,
                message: feedbackForm.querySelector('#feedback-message').value,
                email: feedbackForm.querySelector('#feedback-email').value,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                version: this.version
            };
            
            console.log('Feedback submitted:', formData);
            
            // In a real app, this would send to a server
            // For now, save locally and show confirmation
            try {
                if (window.offlineDb) {
                    await offlineDb.add('feedback', formData);
                }
                
                this.showNotification('Thank you for your feedback!', 'success');
                document.body.removeChild(feedbackForm);
            } catch (error) {
                console.error('Failed to save feedback:', error);
                this.showNotification('Failed to save feedback. Please try again.', 'error');
            }
        });
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = 'footer-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#F44336' : '#2196F3'};
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 2000;
            animation: slide-up 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(-50%) translateY(20px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    // Public methods
    updateVersion(newVersion) {
        this.version = newVersion;
        const versionElement = document.querySelector('.footer-version');
        if (versionElement) {
            versionElement.textContent = `Version ${newVersion}`;
        }
    }
    
    updateCopyright(year) {
        this.copyrightYear = year;
        const copyrightElement = document.querySelector('.footer-copyright');
        if (copyrightElement) {
            copyrightElement.textContent = `© ${year} Farm Manager Pro. All rights reserved.`;
        }
    }
    
    updateLinks(newLinks) {
        this.links = newLinks;
        // Re-render footer links section
        const linksContainer = document.querySelector('.links-container');
        if (linksContainer) {
            linksContainer.innerHTML = newLinks.map(link => `
                <a href="${link.href}" 
                   class="footer-link" 
                   target="${link.target || '_self'}"
                   rel="noopener noreferrer">
                    ${link.text}
                </a>
            `).join('');
        }
    }
    
    show() {
        const footer = document.querySelector('.app-footer');
        if (footer) {
            footer.style.display = 'block';
            setTimeout(() => {
                footer.style.opacity = '1';
                footer.style.transform = 'translateY(0)';
            }, 10);
        }
    }
    
    hide() {
        const footer = document.querySelector('.app-footer');
        if (footer) {
            footer.style.opacity = '0';
            footer.style.transform = 'translateY(20px)';
            setTimeout(() => {
                footer.style.display = 'none';
            }, 300);
        }
    }
}

export default Footer;