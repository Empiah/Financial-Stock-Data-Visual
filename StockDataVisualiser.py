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
    month_31 = ('1', '3', '5', '7', '8', '10', '12')

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


def main():
    ticker = get_ticker()
    year = get_year()
    month = get_month()
    day = get_day(month)
    print(ticker, year, month, day)

if __name__ == "__main__":
    main()


#first we need to find a webservice that will allow us to take in stock data
#for this we will use Quandl - we have made an accounts
"""
data = quandl.get_table('WIKI/PRICES', ticker = ['AAPL', 'MSFT', 'WMT'], 
                        qopts = { 'columns': ['ticker', 'date', 'adj_close'] }, 
                        date = { 'gte': '2015-12-31', 'lte': '2016-12-31' }, 
                        paginate=True)
print(data.head())
"""
