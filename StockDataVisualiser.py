import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from datetime import date
import quandl

# ~/Dropbox/6.\ Python/Python\ Projects/StockData/Financial-Stock-Data-Visual

#the objective of this is to get stock data to enable us to produce the statistics that we want
#for this we will use quandl - it is easy to use and has its own package

quandl.ApiConfig.api_key = 'EYNDSC9qo_AsccGyr4gR'
quandl.ApiConfig.api_version = '2015-04-09'

#first of all we need to get some input from the user as to what stocks they want to see
def get_ticker():
    
    #in an excel document we have a list of all acceptable values that can be entered
    available_tickers = pd.read_csv('Data/ticker_list.csv')
    available_tickers = available_tickers[['ticker']]

    #general overview to the user of what this script will do
    print('This script will take some user input and display various statistics and graphs')
    
    #this will get some user input, it will only take valid inputs
    while True:
        try:
            ticker = str(input('\nPlease enter a stock ticker:\n'))
        #this will return if what is entered is not a string
        except ValueError:
            print('{} was not understood'.format(ticker))
            continue
        #this will return if what is entered is not in the csv above
        if available_tickers.ticker.isin([ticker.upper()]).any() == False:
            print('{} was not in the list of available tickers'.format(ticker))
            continue
        #if these criterias are all met then we can accept the input
        else:
            ticker = ticker.upper()
            break
    return ticker

def get_year():

    curr_year = date.today().year

    #this will get some user input, it will only take valid year inputs
    while True:
        try:
            year = int(input('\nPlease enter the year:\n'))
        #this will return if what is entered is not a string
        except ValueError:
            print('{} was not understood'.format(year))
            continue
        #this will return if the year that is entered is greater than the current year
        if year > curr_year:
            print('{} is not available'.format(year))
            continue
        #if these criterias are all met then we can accept the input
        else:
            year = year
            break
    return year


def get_month():
    #this will get some user input, it will only take valid month inputs
    while True:
        try:
            month = int(input('\nPlease enter the month in numbers (e.g 7):\n'))
        #this will return if what is entered is not a string
        except ValueError:
            print('{} was not understood'.format(month))
            continue
        #this will return if what is entered is greater than 12
        if month > 12:
            print('{} is not available'.format(month))
            continue
        #if these criterias are all met then we can accept the input
        else:
            month = month
            break
    return month

def get_day(month):
    #this will get some user input, it will only take valid month inputs

    month_28 = ('2')
    month_30 = ('4', '6', '9', '11')

    if str(month) in month_28:
        month_max = 28
    elif str(month) in month_30:
        month_max = 30
    else:
        month_max = 31

    while True:
        try:
            day = int(input('\nPlease enter the day in numbers (e.g 20):\n'))
        #this will return if what is entered is not a string
        except ValueError:
            print('{} was not understood'.format(day))
            continue
        #this will return if what is entered is greater than 12
        if day > month_max:
            print('{} is not available'.format(day))
            continue
        #if these criterias are all met then we can accept the input
        else:
            day = day
            break
    return day


def get_start_date(ticker):
    #we need to get the full start date
    print('\nIn this script we will look at stock data over a date range, please enter the start date')

    #now we need to run the above scripts to get the relevant details
    year = get_year()
    month = get_month()
    day = get_day(month)

    start_year = year
    start_month = month
    start_day = day

    #now we append dashes inbetween so that it is in the right format to be called from quandl
    start_date = str(start_year) + '-' + str(start_month) + '-' + str(start_day)

    #we will present this date to the user to confirm it
    while True:
        start_confirm = str(input('\nPlease confirm the input is correct [y/n] \nStart Date = {}\nTicker = {}\n'.format(start_date, ticker.upper())))
        if start_confirm.lower() == 'y':
            print('Thanks for confirming!\n')
            start_date = start_date
            break
        elif start_confirm.lower() == 'n':
            #if the user selects no, we will close the script
            print('\nOkay lets get that information again - the system will close, please run again to start\n')
            raise SystemExit
            break
        else:
            #we will confirm the output
            print('Sorry that was not a valid input - please try again')
            start_date = start_date
            continue

    return start_date


def get_end_date():
    
    print('\nWe also need the end date, you can enter a date or choose "latest" \n')

    #this enables the user just to pick the latest date, which would be todays date if they type 'l'
    while True:
        end_or_latest = str(input('If you want latest, type "l" and if you want to select, type "n"\n'))
        if end_or_latest.lower() == 'l':
            print('Thanks for selecting the most recent date')
            year = date.today().year
            month = date.today().month
            day = date.today().day
            break
        #if this type 'n then they can pick a date like they did before
        elif end_or_latest.lower() == 'n':
            year = get_year()
            month = get_month()
            day = get_day(month)
            break
        else:
            print('{} was not a valid input, please enter "l" for latest date, or "n" to select'. format(end_or_latest))
            continue
            
    end_year = year
    end_month = month
    end_day = day

    #now we append dashes inbetween so that it is in the right format to be called from quandl
    end_date = str(end_year) + '-' + str(end_month) + '-' + str(end_day)

    #we will present this date to the user to confirm it
    while True:
        end_confirm = str(input('\nPlease confirm the input is correct\nEnd Date = {}\n[y/n]\n'.format(end_date)))
        if end_confirm.lower() == 'n':
            #if the user selects no, we will close the script
            print('\nOkay lets get that information again - the system will close, please run again to start\n')
            raise SystemExit
            break
        elif end_confirm.lower() == 'y':
            #we will confirm the output
            print('Thanks for confirming!')
            end_date = end_date
            break
        else:
            print('{} was not a valid input, please confirm with "y" or "n"'. format(end_confirm))
            continue
    
    return end_date


def get_stock_information(ticker, start_date, end_date):
    #we need to find a data service that we can use that will allow us to take stock data
    #we will use Quandl- we have made an account and our API key and data is at the top of this script

    data = quandl.get_table('WIKI/PRICES', ticker = ticker, 
                        qopts = { 'columns': ['ticker', 'date', 'adj_close'] }, 
                        date = { 'gte': str(start_date), 'lte': str(end_date) }, 
                        paginate=True)

    return data








def main():
    ticker = get_ticker()
    start_date = get_start_date(ticker)
    end_date = get_end_date()
    get_stock_information(ticker, start_date, end_date)

    print(ticker, start_date, end_date)

if __name__ == "__main__":
    main()



#TODO v1
#import stock data
#create MACD, RSI calcs
#create graphs
#when confirming the stock, return name

#TODO v2
#need to add ability to get multiple tickers

