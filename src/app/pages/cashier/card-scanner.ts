import { Component, ElementRef, OnDestroy, input, output, viewChild } from '@angular/core';

// ─── Simulated card data (realistic Philippine IDs) ───────────────────────────
const SENIOR_POOL = [
  { name: 'Florentino V. Floro Jr.', id: '8764', dob: '11/05/1953', age: 72, address: 'Poblacion Baliwag, Bulacan' },
  { name: 'Rosario T. Dela Cruz',    id: '3291', dob: '04/12/1948', age: 76, address: 'Sto. Cristo, Baliuag, Bulacan' },
  { name: 'Ernesto M. Santos',       id: '5047', dob: '07/22/1955', age: 70, address: 'Tangos, Baliuag, Bulacan' },
  { name: 'Pacita L. Reyes',         id: '6183', dob: '02/14/1951', age: 74, address: 'Pagala, Baliuag, Bulacan' },
];

const PWD_POOL = [
  { name: 'Juan Dela Cruz',         id: '137404', disability: 'Psychosocial',          municipality: 'Baliuag, Bulacan' },
  { name: 'Maria Fe G. Ocampo',     id: '094821', disability: 'Visual Impairment',     municipality: 'San Rafael, Bulacan' },
  { name: 'Roberto C. Aquino',      id: '205376', disability: 'Orthopedic Disability', municipality: 'Bustos, Bulacan' },
  { name: 'Lourdes B. Paglinawan',  id: '318542', disability: 'Hearing Impairment',    municipality: 'Angat, Bulacan' },
];

function pickRandom<T>(arr: T[]) { return arr[Math.floor(Math.random() * arr.length)]; }

type ScanState = 'idle' | 'scanning' | 'done' | 'error';

export interface ScannedData {
  name: string;
  idNumber: string;
  extra: string;        // age line for senior, disability for PWD
  thumbnail: string;    // data URL of the uploaded image
}

@Component({
  selector: 'app-card-scanner',
  templateUrl: './card-scanner.html',
})
export class CardScanner implements OnDestroy {
  discountType = input.required<'senior' | 'pwd'>();
  confirm = output<ScannedData>();

  private fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');
  private anim: ReturnType<typeof setInterval> | null = null;

  scanState: ScanState = 'idle';
  progress = 0;
  scanned: ScannedData | null = null;
  imgSrc: string | null = null;
  dragOver = false;

  get cardLabel() { return this.discountType() === 'senior' ? 'Senior Citizen' : 'PWD'; }
  get cardColor() { return this.discountType() === 'senior' ? '#4A7C59' : '#7A3B1E'; }

  ngOnDestroy() { if (this.anim) clearInterval(this.anim); }

  private runScan(dataUrl: string) {
    this.imgSrc = dataUrl;
    this.scanState = 'scanning';
    this.progress = 0;
    let p = 0;
    this.anim = setInterval(() => {
      p += Math.random() * 18 + 4;
      if (p >= 100) {
        p = 100;
        clearInterval(this.anim!);
        let extra: string;
        let pick: { name: string; id: string };
        if (this.discountType() === 'senior') {
          const s = pickRandom(SENIOR_POOL);
          pick = s;
          extra = `Born ${s.dob} · Age ${s.age} · ${s.address}`;
        } else {
          const d = pickRandom(PWD_POOL);
          pick = d;
          extra = `${d.disability} · ${d.municipality}`;
        }
        this.scanned = { name: pick.name, idNumber: pick.id, extra, thumbnail: dataUrl };
        this.scanState = 'done';
      }
      this.progress = Math.min(p, 100);
    }, 90);
  }

  private handleFile(file: File) {
    if (!file.type.startsWith('image/')) { this.scanState = 'error'; return; }
    const reader = new FileReader();
    reader.onload = e => this.runScan(e.target!.result as string);
    reader.readAsDataURL(file);
  }

  browse() { this.fileInput()?.nativeElement.click(); }

  onFileChange(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) this.handleFile(f);
  }

  onDragOver(e: DragEvent) { e.preventDefault(); this.dragOver = true; }

  onDrop(e: DragEvent) {
    e.preventDefault();
    this.dragOver = false;
    const file = e.dataTransfer?.files[0];
    if (file) this.handleFile(file);
  }

  reset() {
    this.scanState = 'idle';
    this.scanned = null;
    this.imgSrc = null;
    this.progress = 0;
    if (this.anim) clearInterval(this.anim);
  }
}
