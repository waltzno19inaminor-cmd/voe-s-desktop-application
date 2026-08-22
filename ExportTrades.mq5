//+------------------------------------------------------------------+
//|                                                 ExportTrades.mq5 |
//|                                  Copyright 2026, MetaTrader 5    |
//|        Auto-exports open positions & deal history for App Sync   |
//+------------------------------------------------------------------+
#property copyright "Copyright 2026"
#property link      ""
#property version   "1.10"

int OnInit()
{
   EventSetTimer(2);
   ExportDataToJson();
   return(INIT_SUCCEEDED);
}

void OnDeinit(const int reason)
{
   EventKillTimer();
}

void OnTimer()
{
   ExportDataToJson();
}

void ExportDataToJson()
{
   int file_handle = FileOpen("trades.json", FILE_WRITE|FILE_TXT|FILE_ANSI|FILE_COMMON);
   if(file_handle != INVALID_HANDLE)
   {
      HistorySelect(0, TimeCurrent());
      int total_deals = HistoryDealsTotal();
      int total_positions = PositionsTotal();

      string json = "{\n  \"positions\": [\n";

      // 1. Open Positions
      for(int i = 0; i < total_positions; i++)
      {
         ulong ticket = PositionGetTicket(i);
         if(ticket > 0)
         {
            string symbol = PositionGetString(POSITION_SYMBOL);
            long type = PositionGetInteger(POSITION_TYPE);
            double volume = PositionGetDouble(POSITION_VOLUME);
            double price_open = PositionGetDouble(POSITION_PRICE_OPEN);
            double price_current = PositionGetDouble(POSITION_PRICE_CURRENT);
            double sl = PositionGetDouble(POSITION_SL);
            double tp = PositionGetDouble(POSITION_TP);
            double profit = PositionGetDouble(POSITION_PROFIT);
            double swap = PositionGetDouble(POSITION_SWAP);
            double commission = PositionGetDouble(POSITION_COMMISSION);
            datetime time_open = (datetime)PositionGetInteger(POSITION_TIME);
            string type_str = (type == POSITION_TYPE_BUY) ? "BUY" : "SELL";

            string item = StringFormat(
               "    {\"ticket\": %I64u, \"symbol\": \"%s\", \"type\": \"%s\", \"volume\": %.2f, \"price_open\": %.5f, \"price_current\": %.5f, \"sl\": %.5f, \"tp\": %.5f, \"profit\": %.2f, \"swap\": %.2f, \"commission\": %.2f, \"time\": %lld}%s\n",
               ticket, symbol, type_str, volume, price_open, price_current, sl, tp, profit, swap, commission, (long)time_open, (i < total_positions - 1 ? "," : "")
            );
            json += item;
         }
      }

      json += "  ],\n  \"deals\": [\n";

      // 2. Deal History
      int valid_deal_count = 0;
      // First count valid deals for comma formatting
      for(int i = 0; i < total_deals; i++)
      {
         ulong d_ticket = HistoryDealGetTicket(i);
         if(d_ticket > 0 && StringLen(HistoryDealGetString(d_ticket, DEAL_SYMBOL)) > 0)
            valid_deal_count++;
      }

      int processed = 0;
      for(int i = 0; i < total_deals; i++)
      {
         ulong deal_ticket = HistoryDealGetTicket(i);
         if(deal_ticket > 0)
         {
            string symbol = HistoryDealGetString(deal_ticket, DEAL_SYMBOL);
            if(StringLen(symbol) == 0) continue;

            long type = HistoryDealGetInteger(deal_ticket, DEAL_TYPE);
            long entry = HistoryDealGetInteger(deal_ticket, DEAL_ENTRY);
            double volume = HistoryDealGetDouble(deal_ticket, DEAL_VOLUME);
            double price = HistoryDealGetDouble(deal_ticket, DEAL_PRICE);
            double profit = HistoryDealGetDouble(deal_ticket, DEAL_PROFIT);
            double swap = HistoryDealGetDouble(deal_ticket, DEAL_SWAP);
            double commission = HistoryDealGetDouble(deal_ticket, DEAL_COMMISSION);
            long position_id = HistoryDealGetInteger(deal_ticket, DEAL_POSITION_ID);
            datetime time_deal = (datetime)HistoryDealGetInteger(deal_ticket, DEAL_TIME);
            long time_msc = HistoryDealGetInteger(deal_ticket, DEAL_TIME_MSC);
            ulong order_ticket = HistoryDealGetInteger(deal_ticket, DEAL_ORDER);
            double sl = 0;
            double tp = 0;

            if(order_ticket > 0 && HistoryOrderSelect(order_ticket))
            {
               sl = HistoryOrderGetDouble(order_ticket, ORDER_SL);
               tp = HistoryOrderGetDouble(order_ticket, ORDER_TP);
            }

            if((sl == 0 || tp == 0) && position_id > 0)
            {
               int total_orders = HistoryOrdersTotal();
               for(int o = 0; o < total_orders; o++)
               {
                  ulong oticket = HistoryOrderGetTicket(o);
                  if(oticket > 0 && HistoryOrderSelect(oticket))
                  {
                     if(HistoryOrderGetInteger(oticket, ORDER_POSITION_ID) == position_id)
                     {
                        if(sl == 0) sl = HistoryOrderGetDouble(oticket, ORDER_SL);
                        if(tp == 0) tp = HistoryOrderGetDouble(oticket, ORDER_TP);
                        if(sl > 0 && tp > 0) break;
                     }
                  }
               }
            }

            processed++;
            string item = StringFormat(
               "    {\"ticket\": %I64u, \"position_id\": %lld, \"symbol\": \"%s\", \"type\": %lld, \"entry\": %lld, \"volume\": %.2f, \"price\": %.5f, \"sl\": %.5f, \"tp\": %.5f, \"profit\": %.2f, \"swap\": %.2f, \"commission\": %.2f, \"time\": %lld, \"time_msc\": %lld}%s\n",
               deal_ticket, position_id, symbol, type, entry, volume, price, sl, tp, profit, swap, commission, (long)time_deal, time_msc, (processed < valid_deal_count ? "," : "")
            );
            json += item;
         }
      }

      json += "  ]\n}";
      FileWriteString(file_handle, json);
      FileClose(file_handle);
   }
}

