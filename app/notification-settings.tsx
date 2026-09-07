"use client";
import {Button} from "@/components/ui/button";
import {DialogContent,DialogHeader,DialogTitle,DialogDescription} from "@/components/ui/dialog";
export function NotificationSettings(){
  return <DialogContent className="form-dialog"><DialogHeader><DialogTitle>Мои уведомления</DialogTitle><DialogDescription>В бесплатной версии без отдельного сервера.</DialogDescription></DialogHeader>
    <p><strong>Когда «Между нами» открыто</strong>, приложение автоматически проверяет новые сообщения и показывает уведомление внутри сайта.</p>
    <p>Системные push-уведомления при полностью закрытом сайте пока отключены. Это единственная функция старой серверной версии, которую мы временно не переносим.</p>
    <p className="photo-hint">Календарные события по-прежнему можно добавлять в календарь телефона и получать обычные напоминания телефона.</p>
    <Button variant="outline" onClick={()=>location.reload()}>Обновить данные</Button>
  </DialogContent>;
}
