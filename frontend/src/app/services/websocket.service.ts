import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { Environment as Env } from '../models/environment.model';

export interface QaUpdateEvent {
  _id: string;
  team: string;
  environmentName: string;
  status: string;
}

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private socket: Socket;
  private environmentUpdate$ = new Subject<Env>();
  private qaUpdate$ = new Subject<QaUpdateEvent>();

  constructor() {
    // Conectar al servidor WebSocket
    const socketUrl = environment.production 
      ? 'https://admin-environments.onrender.com' 
      : 'http://localhost:3000';
    
    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling']
    });

    // Escuchar eventos de actualización
    this.socket.on('environment-updated', (data: Env) => {
      console.log('🔄 Ambiente actualizado:', data);
      this.environmentUpdate$.next(data);
    });

    this.socket.on('qa-updated', (data: QaUpdateEvent) => {
      console.log('🔄 Solicitud de QA actualizada:', data);
      this.qaUpdate$.next(data);
    });

    this.socket.on('connect', () => {
      console.log('✅ WebSocket conectado');
    });

    this.socket.on('disconnect', () => {
      console.log('❌ WebSocket desconectado');
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('❌ Error de conexión WebSocket:', error);
    });
  }

  // Observable para escuchar actualizaciones de ambientes
  onEnvironmentUpdate(): Observable<Env> {
    return this.environmentUpdate$.asObservable();
  }

  // Observable para escuchar actualizaciones de solicitudes de QA
  onQaUpdate(): Observable<QaUpdateEvent> {
    return this.qaUpdate$.asObservable();
  }

  // Desconectar socket (opcional, para cleanup)
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}
