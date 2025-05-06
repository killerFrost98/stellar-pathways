import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

interface BlogItem {
  title: string;
  file: string;
}

interface BlogSection {
  title: string;
  items: BlogItem[];
  collapsed?: boolean;
}

@Component({
  selector: 'app-blog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './blog.component.html',
  styleUrls: ['./blog.component.css']
})
export class BlogComponent implements OnInit {
  blogSections: BlogSection[] = [
    {
      title: 'Computer Science',
      collapsed: false,
      items: [
        { title: 'ARM vs x86', file: 'assets/blogs/cpu-micro-architecture.html' },
        { title: 'Memory management', file: 'assets/blogs/memory-management.html' },
        { title: 'Distributed computing', file: 'assets/blogs/distributed-systems.html' }
      ]
    },
    {
      title: 'Biology',
      collapsed: false,
      items: [
        { title: 'Immune System', file: 'assets/blogs/immune-system.html' }
      ]
    },
    {
      title: 'Physics',
      collapsed: false,
      items: [
        { title: 'Noether theorem', file: 'assets/blogs/cpu-micro-architecture.html' }
      ]
    }
  ];

  selectedContent: SafeHtml = '';
  selectedItem: BlogItem | null = null;
  isSidebarOpen: boolean = false; // Hidden by default

  constructor(private http: HttpClient, private sanitizer: DomSanitizer) { }

  ngOnInit(): void {
    // Optionally load the first post by default
    const firstSectionWithItems = this.blogSections.find(s => s.items.length > 0);
    if (firstSectionWithItems) {
      this.loadContent(firstSectionWithItems.items[0]);
    }
  }

  toggleSection(section: BlogSection): void {
    section.collapsed = !section.collapsed;
  }

  loadContent(item: BlogItem): void {
    this.selectedItem = item;
    this.http.get(item.file, { responseType: 'text' })
      .subscribe({
        next: (data: string) => {
          this.selectedContent = this.sanitizer.bypassSecurityTrustHtml(data);
        },
        error: (err) => {
          console.error('Error loading content:', err);
          this.selectedContent = 'Error loading content.';
        }
      });
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }
}